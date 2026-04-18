const jwt = require('jsonwebtoken');
const pool = require('../config/db');

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Fetch the user from the database based on the typed username
        const { rows } = await pool.query('SELECT id, role, password_hash FROM users WHERE username = $1', [username]);
        
        // Check if user exists
        if (rows.length === 0) {
            return res.status(404).json({ message: "Invalid username or user does not exist." });
        }
        
        // Verify the password (bypassing bcrypt hashing strictly for hackathon demo speed)
        if (rows[0].password_hash !== password) {
            return res.status(401).json({ message: "Incorrect password. Access denied." });
        }
        
        // Generate a secure JWT
        const token = jwt.sign({ role: rows[0].role, id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, message: "Logged in successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error during authentication" });
    }
};