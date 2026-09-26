const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Read store config and transactions
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.submissions) data.submissions = [];
    return data;
  } catch {
    return { submissions: [], plans: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Public: Get Store Config
app.get('/api/config', (req, res) => {
  const data = readData();
  // Don't leak full submission log to the public
  const publicData = { ...data, submissionsCount: data.submissions.length };
  delete publicData.submissions;
  res.json(publicData);
});

// Public: User submits a 12-digit UTR
app.post('/api/submit-utr', (req, res) => {
  const { utr, planId, planTitle, price, deviceToken } = req.body;

  if (!utr || !/^\d{12}$/.test(utr)) {
    return res.status(400).json({ error: 'Valid 12-digit numeric UTR is required.' });
  }

  const data = readData();

  // Check if UTR is already used
  const existing = data.submissions.find(s => s.utr === utr);
  if (existing) {
    if (existing.status === 'APPROVED') {
      return res.json({ success: true, status: 'APPROVED', message: 'Already approved!' });
    }
    return res.json({ success: true, status: existing.status, message: 'UTR already submitted and pending review.' });
  }

  const newEntry = {
    utr,
    planId: Number(planId),
    planTitle,
    price: Number(price),
    deviceToken,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  data.submissions.unshift(newEntry);
  writeData(data);

  res.json({ success: true, status: 'PENDING', message: 'UTR submitted for admin verification.' });
});

// Public: Check user access status by device token
app.get('/api/user-access', (req, res) => {
  const { deviceToken } = req.query;
  if (!deviceToken) return res.json({ unlocked: [] });

  const data = readData();
  const unlocked = data.submissions.filter(s => s.deviceToken === deviceToken && s.status === 'APPROVED');
  res.json({ unlocked });
});

// Admin: Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = 'auth_session_' + Buffer.from(ADMIN_PASSWORD).toString('base64');
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, error: 'Incorrect password' });
});

// Middleware for Admin authentication
function checkAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const expectedToken = 'auth_session_' + Buffer.from(ADMIN_PASSWORD).toString('base64');
  if (authHeader !== expectedToken) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}

// Admin: Save Store Settings
app.post('/api/config', checkAdminAuth, (req, res) => {
  const updatedData = req.body;
  const current = readData();
  
  updatedData.submissions = current.submissions; // Preserve existing UTR submissions
  writeData(updatedData);
  res.json({ success: true, message: 'Settings saved successfully' });
});

// Admin: Get all submitted UTRs
app.get('/api/admin/utrs', checkAdminAuth, (req, res) => {
  const data = readData();
  res.json({ submissions: data.submissions || [] });
});

// Admin: Approve or Reject a UTR
app.post('/api/admin/utr-action', checkAdminAuth, (req, res) => {
  const { utr, action } = req.body; // action: 'APPROVE' or 'REJECT'
  const data = readData();

  const item = data.submissions.find(s => s.utr === utr);
  if (!item) return res.status(404).json({ error: 'UTR not found' });

  item.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  writeData(data);

  res.json({ success: true, message: `UTR ${action.toLowerCase()}d successfully` });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
