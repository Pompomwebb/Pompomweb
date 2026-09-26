const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Prevent unexpected process exits
process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception trapped:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection trapped:', reason);
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const DEFAULT_STORE_DATA = {
  brandName: "VIP 4K VAULT",
  logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80",
  upiId: "merchant@upi",
  telegramUrl: "https://t.me/telegram",
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  },
  submissions: [],
  devices: [],
  plans: [
    { id: 1, title: "Mini Starter Clip Vault", tag: "8,450+ Videos", badge: "4K ULTRA HD", price: 39, image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80", desc: "High-bitrate private video collection available for instant browser streaming." },
    { id: 2, title: "Trending Viral Media Vault", tag: "4,270+ Videos", badge: "4K ULTRA HD", price: 49, image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80", desc: "Full browser streaming and unlocked private folder drives with high speeds." },
    { id: 3, title: "Special VIP Folder Pass", tag: "2,676+ Videos", badge: "4K ULTRA HD", price: 59, image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80", desc: "Exclusive unlisted content collections with fast multi-device streaming." },
    { id: 4, title: "Mega Ultra Stream Pack", tag: "16,265+ Videos", badge: "4K ULTRA HD", price: 69, image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80", desc: "Full high-speed server links with zero buffer times and zero waiting." },
    { id: 5, title: "Studio Archives VIP Box", tag: "6,438+ Videos", badge: "4K ULTRA HD", price: 79, image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80", desc: "Complete direct cloud storage mirror with continuous daily uploads." },
    { id: 6, title: "Master High-Speed Vault", tag: "12,540+ Videos", badge: "4K ULTRA HD", price: 99, image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80", desc: "Top recommended selection with high bitrates, unlocked comments, and cloud mirror." },
    { id: 7, title: "ALL IN ONE PREMIUM LIFETIME", tag: "50,000+ Full Catalog", badge: "LIFETIME VIP", price: 199, image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80", desc: "Unlimited streaming & downloads for all collections, private channels, and lifetime updates." }
  ]
};

// Safe storage reader with automatic recovery
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      writeData(DEFAULT_STORE_DATA);
      return JSON.parse(JSON.stringify(DEFAULT_STORE_DATA));
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.submissions) data.submissions = [];
    if (!data.devices) data.devices = [];
    if (!data.admin) data.admin = DEFAULT_STORE_DATA.admin;
    return data;
  } catch (err) {
    console.error('Corrupted data.json, restoring safe state:', err.message);
    writeData(DEFAULT_STORE_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_STORE_DATA));
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('File write failure:', err.message);
  }
}

// Health Ping endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Public: Get Store Config
app.get('/api/config', (req, res) => {
  try {
    const data = readData();
    const publicData = { ...data };
    publicData.plans = (publicData.plans || []).map(p => {
      const safePlan = { ...p };
      delete safePlan.vaultUrl;
      return safePlan;
    });
    delete publicData.admin;
    delete publicData.submissions;
    delete publicData.devices;
    res.json(publicData);
  } catch (err) {
    res.status(500).json({ error: 'Config fetch error' });
  }
});

// Public: Register Device
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

// Public: Submit UTR
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
    planTitle: planTitle || 'VIP Subscription',
    price: Number(price) || 0,
    deviceToken: deviceToken || 'unknown',
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
  const approvedSubmissions = (data.submissions || []).filter(s => s.deviceToken === deviceToken && s.status === 'APPROVED');

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
  const { username, password } = req.body;
  const data = readData();
  const admin = data.admin || DEFAULT_STORE_DATA.admin;

  if (username === admin.username && password === admin.password) {
    const token = 'auth_session_' + Buffer.from(`${admin.username}:${admin.password}`).toString('base64');
    return res.json({ success: true, token, username: admin.username });
  }
  return res.status(401).json({ success: false, error: 'Invalid username or password' });
});

function checkAdminAuth(req, res, next) {
  const data = readData();
  const admin = data.admin || DEFAULT_STORE_DATA.admin;
  const expectedToken = 'auth_session_' + Buffer.from(`${admin.username}:${admin.password}`).toString('base64');

  const authHeader = req.headers['authorization'];
  if (authHeader !== expectedToken) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}

// Admin: Security Credentials
app.post('/api/admin/change-credentials', checkAdminAuth, (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;
  const data = readData();
  const admin = data.admin || DEFAULT_STORE_DATA.admin;

  if (currentPassword !== admin.password) {
    return res.status(400).json({ error: 'Current password does not match.' });
  }

  if (newUsername && newUsername.trim()) {
    admin.username = newUsername.trim();
  }

  if (newPassword && newPassword.trim()) {
    if (newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }
    admin.password = newPassword.trim();
  }

  data.admin = admin;
  writeData(data);

  const newToken = 'auth_session_' + Buffer.from(`${admin.username}:${admin.password}`).toString('base64');
  res.json({ success: true, message: 'Credentials updated successfully!', newToken, username: admin.username });
});

// Admin: Stats
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

// Admin: Users List
app.get('/api/admin/users', checkAdminAuth, (req, res) => {
  const data = readData();
  const devices = data.devices || [];
  const submissions = data.submissions || [];

  const userList = devices.map(dev => {
    const userSubs = submissions.filter(s => s.deviceToken === dev);
    const approvedSubs = userSubs.filter(s => s.status === 'APPROVED');
    return {
      deviceToken: dev,
      ordersCount: userSubs.length,
      isPremium: approvedSubs.length > 0,
      totalSpent: approvedSubs.reduce((sum, s) => sum + (Number(s.price) || 0), 0)
    };
  });

  res.json({ users: userList });
});

// Admin: Config Save
app.post('/api/config', checkAdminAuth, (req, res) => {
  const updatedData = req.body;
  const current = readData();
  
  updatedData.admin = current.admin;
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

// Admin: UTR Action
app.post('/api/admin/utr-action', checkAdminAuth, (req, res) => {
  const { utr, action } = req.body;
  const data = readData();

  if (action === 'DELETE') {
    data.submissions = data.submissions.filter(s => s.utr !== utr);
    writeData(data);
    return res.json({ success: true, message: 'Submission deleted' });
  }

  const item = data.submissions.find(s => s.utr === utr);
  if (!item) return res.status(404).json({ error: 'UTR not found' });

  item.status = action;
  writeData(data);

  res.json({ success: true, message: `Status updated to ${action}` });
});

// Single Page Application Fallback: Route every slug (/nagatopanel, /access, /checkout) to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server actively running on port ${PORT}`);
});
