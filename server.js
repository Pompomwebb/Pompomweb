const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Read store config
app.get('/api/config', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read data file' });
    }
    try {
      res.json(JSON.parse(data));
    } catch (parseErr) {
      res.status(500).json({ error: 'Corrupt configuration data' });
    }
  });
});

// Save updated config from Admin Panel
app.post('/api/config', (req, res) => {
  const updatedData = req.body;
  if (!updatedData || !Array.isArray(updatedData.plans)) {
    return res.status(400).json({ error: 'Invalid configuration payload' });
  }

  fs.writeFile(DATA_FILE, JSON.stringify(updatedData, null, 2), 'utf8', (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save configuration' });
    }
    res.json({ success: true, message: 'Settings saved successfully' });
  });
});

// Fallback to index.html for all slug routes (e.g., /panel, /panel/?tab=theme)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server online on port ${PORT}`);
});
