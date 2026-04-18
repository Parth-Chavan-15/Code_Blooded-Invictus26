const pool = require('../config/db');

// --- THE STRICT EXCEL INTAKE ENGINE (INDUSTRY STANDARD) ---
exports.bulkIntake = async (req, res) => {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "No data provided in payload" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); 
        let successCount = 0;

        for (const row of items) {
            // Case-Insensitive Key Matching
            const getVal = (possibleNames) => {
                const rowKeys = Object.keys(row);
                for (const name of possibleNames) {
                    const match = rowKeys.find(k => k.trim().toLowerCase() === name.toLowerCase());
                    if (match !== undefined) return row[match];
                }
                return undefined;
            };

            const Part_Number = getVal(['part_number', 'part number', 'part code', 'item code', 'part no']);
            const Component_Name = getVal(['component_name', 'component name', 'description', 'item name']) || 'Unknown Component';
            
            const rawStock = parseInt(getVal(['current_stock', 'current stock', 'qty', 'quantity', 'count']), 10);
            const Initial_Stock = isNaN(rawStock) ? 0 : rawStock;
            
            const rawMonthly = parseInt(getVal(['monthly_required', 'monthly required', 'target', 'monthly target']), 10);
            const Monthly_Required = isNaN(rawMonthly) ? (Initial_Stock > 0 ? Initial_Stock * 2 : 1000) : rawMonthly;

            if (!Part_Number) continue;

            // Fetch both ID and the stored Name
            const existCheck = await client.query('SELECT id, component_name FROM components WHERE part_number = $1', [String(Part_Number)]);
            
            if (existCheck.rows.length === 0) {
                // Completely new component
                await client.query(
                    `INSERT INTO components (part_number, component_name, current_stock, monthly_required) VALUES ($1, $2, $3, $4)`,
                    [String(Part_Number), String(Component_Name), Initial_Stock, Monthly_Required]
                );
                successCount++;
            } else {
                // COMPONENT EXISTS: STRICT DATA GOVERNANCE CHECK
                const dbName = existCheck.rows[0].component_name;
                
                // Compare names (ignoring case and extra spaces)
                if (dbName.trim().toLowerCase() !== String(Component_Name).trim().toLowerCase()) {
                    // Throw a custom error that triggers the ROLLBACK
                    throw new Error(`Data Integrity Error on Part ${Part_Number}: Excel says '${Component_Name}', but Database says '${dbName}'. Upload aborted.`);
                }

                // If names match perfectly, securely ADD the stock
                await client.query(
                    `UPDATE components SET current_stock = current_stock + $1 WHERE part_number = $2`,
                    [Initial_Stock, String(Part_Number)]
                );
                successCount++;
            }
        }
        
        await client.query('COMMIT');
        res.json({ message: `Successfully synced ${successCount} components.` });
    } catch (error) {
        console.error("Bulk Intake Error:", error.message);
        await client.query('ROLLBACK'); 
        
        // Send the specific mismatch error to the frontend if it's our custom error
        const errorMsg = error.message.includes("Data Integrity Error") 
            ? error.message 
            : "Database rejected the Excel payload. Verify column names.";
            
        res.status(400).json({ message: errorMsg });
    } finally {
        client.release();
    }
};

// --- REAL, LIVE CONSUMPTION DATA (No More Fake Data) ---
exports.getConsumptionSummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.component_name, COALESCE(SUM(ch.quantity_deducted), 0) as total_consumed
      FROM components c
      LEFT JOIN consumption_history ch ON c.id = ch.component_id
      GROUP BY c.component_name
      ORDER BY total_consumed DESC
      LIMIT 10
    `);
    
    // Returns live database values. If total_consumed is 0, the chart renders it natively.
    res.json(result.rows);
  } catch (error) {
    console.error("Consumption fetch error:", error);
    res.status(500).json({ error: "Failed to fetch real consumption data." });
  }
};

// --- THE REST OF YOUR EXISTING CONTROLLERS ---
exports.getLowStock = async (req, res) => {
    try {
        const result = await pool.query(`SELECT component_name, current_stock, monthly_required FROM components WHERE is_low_stock = true`);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch alerts." });
    }
};

exports.getAllPCBs = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, pcb_name FROM pcbs');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch PCBs." });
    }
};

// --- UPGRADED: Fetch Complete Inventory Details ---
exports.getAllInventory = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, part_number, component_name, current_stock, monthly_required, is_low_stock, quarantined_stock 
      FROM components 
      ORDER BY component_name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ message: "Database error fetching inventory." });
  }
};

// --- NEW: Fetch Granular QC/Maintenance Logs ---
exports.getMaintenanceDetails = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.action_type, m.quantity, m.logged_at, c.component_name, c.part_number
      FROM maintenance_logs m
      JOIN components c ON m.component_id = c.id
      ORDER BY m.logged_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching maintenance details:", error);
    res.status(500).json({ error: "Failed to fetch maintenance details." });
  }
};

exports.repairInventory = async (req, res) => {
  const { componentId, quantity, action } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); 

    // Lock the row to prevent race conditions
    const stockRes = await client.query('SELECT current_stock, quarantined_stock FROM components WHERE id = $1 FOR UPDATE', [componentId]);
    if (stockRes.rows.length === 0) throw new Error("Component not found.");
    
    const { current_stock, quarantined_stock } = stockRes.rows[0];

    if (action === 'scrap') {
        if (current_stock < quantity) throw new Error(`Cannot scrap. Only ${current_stock} available.`);
        await client.query('UPDATE components SET current_stock = current_stock - $1 WHERE id = $2', [quantity, componentId]);
    } 
    else if (action === 'rework') {
        if (current_stock < quantity) throw new Error(`Cannot quarantine. Only ${current_stock} available.`);
        // Deduct from active, add to quarantine
        await client.query('UPDATE components SET current_stock = current_stock - $1, quarantined_stock = quarantined_stock + $1 WHERE id = $2', [quantity, componentId]);
    }
    else if (action === 'recover') {
        if (quarantined_stock < quantity) throw new Error(`Cannot recover. Only ${quarantined_stock} in quarantine.`);
        // Deduct from quarantine, add back to active
        await client.query('UPDATE components SET quarantined_stock = quarantined_stock - $1, current_stock = current_stock + $1 WHERE id = $2', [quantity, componentId]);
    }

    // Log the action for the audit trail
    await client.query(
      'INSERT INTO maintenance_logs (component_id, action_type, quantity) VALUES ($1, $2, $3)',
      [componentId, action, quantity]
    );
    
    await client.query('COMMIT');
    
    const actionText = action === 'scrap' ? 'scrapped' : action === 'rework' ? 'moved to quarantine' : 'recovered to active stock';
    res.status(200).json({ message: `Successfully ${actionText} ${quantity} units.` });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: error.message || "Transaction blocked: Database error." });
  } finally {
    client.release();
  }
};

exports.getMaintenanceStats = async (req, res) => {
  try {
    const result = await pool.query(`SELECT action_type, SUM(quantity) as total FROM maintenance_logs GROUP BY action_type`);
    let reworkCount = 0; let scrapCount = 0;

    result.rows.forEach(row => {
        if (row.action_type === 'rework') reworkCount = parseInt(row.total, 10);
        if (row.action_type === 'scrap') scrapCount = parseInt(row.total, 10);
    });

    res.json([
      { name: 'Total Reworked', value: reworkCount, fill: '#F59E0B' },
      { name: 'Total Scrapped', value: scrapCount, fill: '#EF4444' } 
    ]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch maintenance stats." });
  }
};

exports.updateTarget = async (req, res) => {
  const { id, monthly_required } = req.body;
  if (!monthly_required || monthly_required <= 0) {
      return res.status(400).json({ message: "Target must be greater than 0." });
  }

  try {
    // The PostgreSQL BEFORE UPDATE trigger will automatically recalculate is_low_stock based on this new target!
    await pool.query('UPDATE components SET monthly_required = $1 WHERE id = $2', [monthly_required, id]);
    res.json({ message: "Target updated successfully." });
  } catch (error) {
    console.error("Update target error:", error);
    res.status(500).json({ message: "Database error updating target." });
  }
};