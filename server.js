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
  brandName: "𝗩𝗜𝗣 𝗠𝗠𝗦 𝗟𝗘𝗔𝗞𝗦 🥵💦",
  logoUrl: "https://kommodo.ai/i/oWHbPuDE2NSwro21YVwB",
  upiId: "YOUR_UPI",
  telegramUrl: "https://t.me/",
  admin: {
    username: process.env.ADMIN_USERNAME || 'nagato',
    password: process.env.ADMIN_PASSWORD || 'nagato@123'
  },
  submissions: [],
  devices: [],
  plans: [
    { id: 1, title: "💦 𝐘𝐨𝐮𝐧𝐠 𝐠𝐢𝐫𝐥 + 𝐂𝐡!𝐥𝐝 𝐛𝐨𝐲 💦", tag: "8,450+ Videos", badge: "4K ULTRA HD", price: 79, image: "https://kommodo.ai/i/bs5Jc82Da3kYKlg4M8jz", desc: "Young girl and child boy playing with each other 🤤🔞." },
    { id: 2, title: "💎 🌝 ¢𝐡!𝐥𝐝 + 𝐑@𝐩€ 𝐜@𝐬𝐞 + 𝐌0𝐦 & 𝐒0𝐧 🥵", tag: "12,270+ Videos", badge: "4K ULTRA HD", price: 129, image: "https://kommodo.ai/i/nQN8bk9TwWUC7kQPvS1a", desc: "Ch!ld R@p€ and M0m and S0n Combo Pack 💋🤤." },
    { id: 3, title: "💋🥵 𝐈𝐧𝐝𝐢𝐚𝐧 𝐏𝐫𝐞𝐦𝐢𝐮𝐦 𝐂𝐨𝐥𝐥𝐞𝐜𝐭𝐢𝐨𝐧 🤩", tag: "5,676+ Videos", badge: "4K ULTRA HD", price: 59, image: "https://kommodo.ai/i/1ycVKC2F7e09clNS3LDE", desc: "Indian 4K Quality Videos Collection 🌽🔥." },
    { id: 4, title: "🫦🔞 𝐁𝐫𝐨𝐭𝐡𝐞𝐫 𝐚𝐧𝐝 𝐒𝐢𝐬𝐭𝐞𝐫 💦", tag: "9,265+ Videos", badge: "4K ULTRA HD", price: 89, image: "https://kommodo.ai/i/DmOPqZLbG6tFuU0zQaCm", desc: "Brother And Sister High Quality Videos 🔥💦." },
    { id: 5, title: "❤️‍🔥🌝 𝐆𝐢𝐫𝐥𝐟𝐫𝐢𝐞𝐧𝐝 & 𝐁𝐨𝐲𝐟𝐫𝐢𝐞𝐧𝐝 𝐋𝐞𝐚𝐤𝐬 🤤", tag: "6,438+ Videos", badge: "4K ULTRA HD", price: 69, image: "https://kommodo.ai/i/v0f3Ck2HYEe1HJ1GSW8k", desc: "Girlfriend having fun with her boyfriend 4K Quality 🎬🔞." },
    { id: 6, title: "✨☠️ 𝐅𝐨𝐫𝐞𝐬𝐭 𝐑@𝐩€ 𝐋𝐞𝐚𝐤𝐬 💦🔥", tag: "9,540+ Videos", badge: "4K ULTRA HD", price: 99, image: "https://kommodo.ai/i/6NOr8DVP1mOQMLeYlmG7", desc: "Jungle Mai Mangal High Quality Videos 🫦🥵." },
    { id: 7, title: "💋💦 𝐀𝐋𝐋 𝐈𝐍 𝐎𝐍𝐄 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 🥵", tag: "50,000+ Full Catalog", badge: "LIFETIME VIP", price: 199, image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80", desc: "All Collection in One Channel 🥵💦." }
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
