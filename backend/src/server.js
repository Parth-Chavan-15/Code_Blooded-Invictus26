const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const app = express();

// Secure CORS - strictly limits access to your local React frontend
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Setup Multer to handle incoming Excel files in RAM
const upload = multer({ storage: multer.memoryStorage() });

// Import Controllers
const authController = require('./controllers/authController');
const inventoryController = require('./controllers/inventoryController');
const productionRoutes = require('./routes/production.routes');
const { verifyToken } = require('./middleware/auth');

// Public Health Check Endpoint
const pool = require('./config/db');
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).send('Enterprise Backend is Operational. Database Connected.');
  } catch (e) {
    res.status(500).send('Database connection failed.');
  }
});

// Authentication
app.post('/api/login', authController.login);

// Protected Inventory Routes
app.get('/api/pcbs', verifyToken, inventoryController.getAllPCBs); 
app.get('/api/inventory/low-stock', verifyToken, inventoryController.getLowStock);
// FIXED: Listen to /bulk-intake and remove multer, because React already parsed the Excel into JSON!
app.post('/api/inventory/bulk-intake', verifyToken, inventoryController.bulkIntake);
app.get('/api/inventory', verifyToken, inventoryController.getAllInventory); 
app.post('/api/inventory/repair', verifyToken, inventoryController.repairInventory); 
app.get('/api/inventory/consumption', verifyToken, inventoryController.getConsumptionSummary); 
app.get('/api/inventory/maintenance-stats', verifyToken, inventoryController.getMaintenanceStats);
app.get('/api/inventory/maintenance-details', verifyToken, inventoryController.getMaintenanceDetails);
app.put('/api/inventory/target', verifyToken, inventoryController.updateTarget);

// Protected Production Routes
app.use('/api/production', productionRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Enterprise Backend Engine running on port ${PORT}`);
});