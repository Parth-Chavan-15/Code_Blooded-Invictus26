const pool = require('../config/db');

exports.producePCB = async (req, res) => {
    const { pcbId, quantityProduced } = req.body;

    // 1. STRICT INPUT VALIDATION (The "Final 5 Lines" additions)
    if (!Number.isInteger(pcbId) || pcbId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid PCB ID.' });
    }
    if (!Number.isInteger(quantityProduced) || quantityProduced <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid production quantity. Must be > 0.' });
    }

    const client = await pool.connect(); 

    try {
        // 2. REPEATABLE READ: Ultimate concurrency protection
        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');

        // 3. Lock the BOM recipe so it cannot be altered mid-production
        const recipeRes = await client.query(
            `SELECT component_id, quantity_required FROM pcb_component_mapping WHERE pcb_id = $1 FOR SHARE`, 
            [pcbId]
        );
        const recipe = recipeRes.rows;

        // Ensure the PCB actually has components mapped to it
        if (recipe.length === 0) {
            throw new Error("PCB has no BOM mapping. Cannot produce empty boards.");
        }

        for (const item of recipe) {
            const totalRequired = item.quantity_required * quantityProduced;
            
            // 4. ROW-LEVEL LOCKING: Secures the component row against race conditions
            const stockRes = await client.query(
                `SELECT current_stock, monthly_required FROM components WHERE id = $1 FOR UPDATE`,
                [item.component_id]
            );
            
            const component = stockRes.rows[0];
            
            // 5. The "Hard Block" rule
            if (component.current_stock < totalRequired) {
                throw new Error(`Insufficient stock for Component ID ${item.component_id}. Required: ${totalRequired}, Available: ${component.current_stock}`);
            }

            const newStock = component.current_stock - totalRequired;
            
            // Deduct Stock
            await client.query(`UPDATE components SET current_stock = $1 WHERE id = $2`, [newStock, item.component_id]);

            // Procurement Trigger Alert (ON CONFLICT prevents spamming the table)
            if (newStock < component.monthly_required * 0.20) {
                await client.query(
                    `INSERT INTO procurement_triggers (component_id, status) VALUES ($1, 'Pending') ON CONFLICT (component_id) WHERE status = 'Pending' DO NOTHING`, 
                    [item.component_id]
                );
            }

            // Append-Only Audit Trail Log
            await client.query(
                `INSERT INTO consumption_history (pcb_id, component_id, quantity_deducted) VALUES ($1, $2, $3)`, 
                [pcbId, item.component_id, totalRequired]
            );
        }

        await client.query('COMMIT'); 
        res.json({ success: true, message: `Successfully produced ${quantityProduced} units. Stock securely deducted.` });

    } catch (error) {
        await client.query('ROLLBACK'); 
        res.status(400).json({ success: false, message: error.message });
    } finally {
        client.release(); 
    }
};

exports.getBOMPreview = async (req, res) => {
    try {
        const { id } = req.params;
        const bomRes = await pool.query(`
            SELECT c.component_name, pcm.quantity_required, c.current_stock 
            FROM pcb_component_mapping pcm
            JOIN components c ON pcm.component_id = c.id
            WHERE pcm.pcb_id = $1
        `, [id]);
        res.json(bomRes.rows);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch BOM Preview" });
    }
};