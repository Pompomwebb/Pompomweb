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

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.submissions) data.submissions = [];
    if (!data.devices) data.devices = [];
    return data;
  } catch {
    return { submissions: [], devices: [], plans: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Public: Get Store Configuration
app.get('/api/config', (req, res) => {
  const data = readData();
  const publicData = { ...data };
  publicData.plans = (publicData.plans || []).map(p => {
    const safePlan = { ...p };
    delete safePlan.vaultUrl;
    return safePlan;
  });
  delete publicData.submissions;
  delete publicData.devices;
  res.json(publicData);
});

// Public: Register Device Token
app.post('/api/register-device', (req, res) => {
  const { deviceToken } = req.body;
  if (!deviceToken) return res.status(400).json({ error: 'Device token required' });
  
  const data = readData();
  if (!data.devices) data.devices = [];
  if (!data.devices.includes(deviceToken)) {
    data.devices.push(deviceToken);
    writeData(data);
  }
  res.json({ success: true });
});

// Public: Submit 12-Digit UTR
app.post('/api/submit-utr', (req, res) => {
  const { utr, planId, planTitle, price, deviceToken } = req.body;

  if (!utr || !/^\d{12}$/.test(utr)) {
    return res.status(400).json({ error: 'Valid 12-digit numeric UTR is required.' });
  }

  const data = readData();
  const existing = data.submissions.find(s => s.utr === utr);

  if (existing) {
    return res.json({ 
      success: true, 
      status: existing.status, 
      message: existing.status === 'APPROVED' ? 'UTR already approved!' : 'UTR is already in review.' 
    });
  }

  const newSubmission = {
    utr,
    planId: Number(planId),
    planTitle,
    price: Number(price),
    deviceToken,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  data.submissions.unshift(newSubmission);
  writeData(data);

  res.json({ success: true, status: 'PENDING', message: 'UTR submitted for admin approval.' });
});

// Public: User Access Check
app.get('/api/user-access', (req, res) => {
  const { deviceToken } = req.query;
  if (!deviceToken) return res.json({ unlocked: [] });

  const data = readData();
  const approvedSubmissions = data.submissions.filter(s => s.deviceToken === deviceToken && s.status === 'APPROVED');

  const unlocked = approvedSubmissions.map(sub => {
    const plan = (data.plans || []).find(p => p.id === sub.planId);
    return {
      utr: sub.utr,
      planTitle: sub.planTitle,
      unlockedAt: sub.createdAt,
      vaultUrl: plan ? plan.vaultUrl || '#' : '#'
    };
  });

  res.json({ unlocked });
});

// Admin: Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = 'auth_session_' + Buffer.from(ADMIN_PASSWORD).toString('base64');
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, error: 'Incorrect master password' });
});

function checkAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const expectedToken = 'auth_session_' + Buffer.from(ADMIN_PASSWORD).toString('base64');
  if (authHeader !== expectedToken) {
    return res.status(403).json({ error: 'Unauthorized request' });
  }
  next();
}

// Admin: Analytics & Overview Stats
app.get('/api/admin/stats', checkAdminAuth, (req, res) => {
  const data = readData();
  const submissions = data.submissions || [];
  const devices = data.devices || [];

  const approved = submissions.filter(s => s.status === 'APPROVED');
  const pending = submissions.filter(s => s.status === 'PENDING');
  const premiumDevices = new Set(approved.map(s => s.deviceToken));
  const totalRevenue = approved.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  res.json({
    totalUsers: Math.max(devices.length, submissions.length),
    premiumUsers: premiumDevices.size,
    paidOrders: approved.length,
    pendingOrders: pending.length,
    totalRevenue: totalRevenue
  });
});

// Admin: Save Configuration
app.post('/api/config', checkAdminAuth, (req, res) => {
  const updatedData = req.body;
  const current = readData();
  
  updatedData.submissions = current.submissions;
  updatedData.devices = current.devices;
  writeData(updatedData);
  res.json({ success: true, message: 'Settings saved successfully' });
});

// Admin: Fetch UTRs
app.get('/api/admin/utrs', checkAdminAuth, (req, res) => {
  const data = readData();
  res.json({ submissions: data.submissions || [] });
});

// Admin: Manage UTR Status & Deletion
app.post('/api/admin/utr-action', checkAdminAuth, (req, res) => {
  const { utr, action } = req.body; // action: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DELETE'
  const data = readData();

  if (action === 'DELETE') {
    data.submissions = data.submissions.filter(s => s.utr !== utr);
    writeData(data);
    return res.json({ success: true, message: 'Submission deleted permanently' });
  }

  const item = data.submissions.find(s => s.utr === utr);
  if (!item) return res.status(404).json({ error: 'UTR record not found' });

  item.status = action;
  writeData(data);

  res.json({ success: true, message: `UTR status changed to ${action}` });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server online on port ${PORT}`);
});
