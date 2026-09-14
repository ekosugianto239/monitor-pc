const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "oni123"; // Ganti password kasir di sini

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let pcStatusData = {};
for (let i = 1; i <= 9; i++) {
  const pcKey = `ONI-${i < 10 ? '0' + i : i}`;
  pcStatusData[pcKey] = { id: pcKey, status: 'available', vga: 'RTX 2060', endTime: null };
}

// Menampung timestamp terakhir sinyal dari admin.html
let lastAdminHeartbeat = 0;

// Helper untuk broadcast data status PC + status admin ke semua client/browser
function broadcastState() {
  const isAdminActive = (Date.now() - lastAdminHeartbeat) < 8000; // Aktif jika ada sinyal < 8 detik
  io.emit('pcStatusUpdate', {
    pcData: pcStatusData,
    adminActive: isAdminActive
  });
}

// Route khusus halaman admin kasir
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Endpoint Heartbeat dari admin.html
app.post('/api/admin-heartbeat', (req, res) => {
  lastAdminHeartbeat = Date.now();
  broadcastState();
  return res.json({ success: true });
});

// Endpoint update manual dengan proteksi password & akumulasi jam
app.post('/api/update-manual', (req, res) => {
  const { pcName, status, hours, packageType, password } = req.body;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Password Kasir Salah!' });
  }

  // Update sinyal heartbeat kasir saat ada aksi klik
  lastAdminHeartbeat = Date.now();

  if (pcName && pcStatusData[pcName]) {
    const pc = pcStatusData[pcName];
    const nowSec = Math.floor(Date.now() / 1000);
    const dateObj = new Date();

    if (status === 'used') {
      // 1. Paket Pagi (Target selesai jam 12:00 WIB)
      if (packageType === 'pagi') {
        const target = new Date();
        target.setHours(12, 0, 0, 0);
        if (dateObj >= target) target.setDate(target.getDate() + 1);
        pc.endTime = Math.floor(target.getTime() / 1000);
      } 
      // 2. Paket Malam (Target selesai jam 06:00 WIB besok)
      else if (packageType === 'malam') {
        const target = new Date();
        if (dateObj.getHours() >= 12) target.setDate(target.getDate() + 1);
        target.setHours(6, 0, 0, 0);
        pc.endTime = Math.floor(target.getTime() / 1000);
      } 
      // 3. Jam Reguler (+1j, +2j, +3j, +5j) dengan sistem akumulasi waktu
      else if (hours) {
        if (pc.status === 'used' && pc.endTime && pc.endTime > nowSec) {
          // Jika PC sudah berjalan, tambahkan jam baru ke sisa waktu yang ada
          pc.endTime += (hours * 3600);
        } else {
          // Jika PC baru dinyalakan/tersedia, hitung dari detik sekarang
          pc.endTime = nowSec + (hours * 3600);
        }
      }
      pc.status = 'used';
    } else {
      // Reset ke TERSEDIA atau OFF
      pc.status = status;
      pc.endTime = null;
    }
    
    broadcastState();
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'Gagal update status' });
});

// Auto-reset status saat countdown selesai per detik
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  Object.keys(pcStatusData).forEach(pcKey => {
    const pc = pcStatusData[pcKey];
    if (pc.status === 'used' && pc.endTime && now >= pc.endTime) {
      pc.status = 'available';
      pc.endTime = null;
    }
  });
  broadcastState();
}, 1000);

io.on('connection', (socket) => {
  broadcastState();
});

if (process.env.NODE_ENV !== 'production') {
  http.listen(PORT, () => {
    console.log(`Server Dashboard berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;