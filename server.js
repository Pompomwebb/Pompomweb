const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Set your Admin Panel password here (or change in Railway environment variables)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Read store config
app.get('/api/config', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read data file' });
    try {
      res.json(JSON.parse(data));
    } catch {
      res.status(500).json({ error: 'Corrupt configuration data' });
    }
  });
});

// Admin Login verification endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    // Return a session token
    const token = 'auth_session_' + Buffer.from(ADMIN_PASSWORD).toString('base64');
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, error: 'Incorrect password' });
});

// Save updated config from Admin Panel (Protected)
app.post('/api/config', (req, res) => {
  const authHeader = req.headers['authorization'];
  const expectedToken = 'auth_session_' + Buffer.from(ADMIN_PASSWORD).toString('base64');

  if (authHeader !== expectedToken) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  const updatedData = req.body;
  if (!updatedData || !Array.isArray(updatedData.plans)) {
    return res.status(400).json({ error: 'Invalid configuration payload' });
  }

  fs.writeFile(DATA_FILE, JSON.stringify(updatedData, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save configuration' });
    res.json({ success: true, message: 'Settings saved successfully' });
  });
});

// Fallback to index.html for all slug routes (/panel, /access, /panel/?tab=theme)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server online on port ${PORT}`);
});
