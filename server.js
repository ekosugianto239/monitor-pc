console.log("=== SERVER MULAI DIJALANKAN ===");
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "oni123"; // Ganti password kasir di sini

// Matikan caching file statis agar update HTML/JS langsung terbaca di browser
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

app.use(express.json());

let pcStatusData = {};
for (let i = 1; i <= 9; i++) {
  const pcKey = `ONI-${i < 10 ? '0' + i : i}`;
  pcStatusData[pcKey] = { 
    id: pcKey, 
    status: 'available', 
    vga: 'RTX 2060', 
    endTime: null,
    bookedBy: '',
    paymentStatus: '',
    scheduledStartTime: 0,
    scheduledDuration: 5
  };
}

// Penampung data War Tiket Promo
let warConfigData = {
  active: false,
  title: 'WAR TIKET PROMO BEGADANG',
  startTime: 0,
  price: 'Rp 15.000 / 5 Jam',
  waNumber: '6281234567890'
};

// Menampung timestamp terakhir sinyal dari admin.html
let lastAdminHeartbeat = 0;

// Helper untuk broadcast data status PC + War Config + status admin ke semua client/browser
function broadcastState() {
  const isAdminActive = (Date.now() - lastAdminHeartbeat) < 8000; // Aktif jika ada sinyal < 8 detik
  io.emit('pcStatusUpdate', {
    pcData: pcStatusData,
    adminActive: isAdminActive
  });
  io.emit('warConfigUpdate', warConfigData);
}

// Route khusus halaman admin kasir (dengan Header No-Cache)
app.get('/admin', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Endpoint Heartbeat dari admin.html
app.post('/api/admin-heartbeat', (req, res) => {
  lastAdminHeartbeat = Date.now();
  broadcastState();
  return res.json({ success: true });
});

// Endpoint update konfigurasi War Tiket dari admin.html
app.post('/api/update-war-config', (req, res) => {
  const { config, password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Password Kasir Salah!' });
  }

  if (config) {
    warConfigData = { ...warConfigData, ...config };
    broadcastState();
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'Data config tidak valid' });
});

// Endpoint simpan data booking manual (Nama Pemesan, Status Pembayaran, Jam Mulai & Durasi)
app.post('/api/update-booking', (req, res) => {
  const { pcName, bookedBy, paymentStatus, scheduledStartTime, scheduledDuration, password } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Password Kasir Salah!' });
  }

  lastAdminHeartbeat = Date.now();

  if (pcName && pcStatusData[pcName]) {
    pcStatusData[pcName].bookedBy = bookedBy || '';
    pcStatusData[pcName].paymentStatus = paymentStatus || '';
    pcStatusData[pcName].scheduledStartTime = scheduledStartTime || 0;
    pcStatusData[pcName].scheduledDuration = scheduledDuration || 5;
    
    broadcastState();
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'Gagal update data booking' });
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
      // MANTAP: Data bookedBy, paymentStatus, dan scheduledStartTime TETAP DIPERTAHANKAN
    } else {
      // Hanya hapus data booking jika tombol RESET / OFF secara eksplisit diklik kasir
      pc.status = status;
      pc.endTime = null;
      pc.bookedBy = '';
      pc.paymentStatus = '';
      pc.scheduledStartTime = 0;
    }
    
    broadcastState();
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'Gagal update status' });
});

// Auto-checker per detik: Pemicu Otomatis Booking & Reset Timer
setInterval(() => {
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);

  Object.keys(pcStatusData).forEach(pcKey => {
    const pc = pcStatusData[pcKey];

    // 1. AUTO TRIGGER: Jika jam sekarang sudah mencapai/melewati scheduledStartTime
    if (pc.bookedBy && pc.scheduledStartTime && nowMs >= pc.scheduledStartTime && pc.status !== 'used') {
      pc.status = 'used';
      const durationHours = pc.scheduledDuration || 5;
      pc.endTime = nowSec + (durationHours * 3600);
    }

    // 2. AUTO RESET: Jika countdown waktu pemakaian telah selesai
    if (pc.status === 'used' && pc.endTime && nowSec >= pc.endTime) {
      pc.status = 'available';
      pc.endTime = null;
      // Otomatis bersihkan booking jika jadwal jam mainnya sudah berakhir
      if (!pc.scheduledStartTime || nowMs >= (pc.scheduledStartTime + ((pc.scheduledDuration || 5) * 3600000))) {
        pc.bookedBy = '';
        pc.paymentStatus = '';
        pc.scheduledStartTime = 0;
      }
    }
  });
  broadcastState();
}, 1000);

io.on('connection', (socket) => {
  broadcastState();

  socket.on('updateWarConfig', (config) => {
    warConfigData = { ...warConfigData, ...config };
    io.emit('warConfigUpdate', warConfigData);
  });
});

http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Dashboard berjalan di port ${PORT}`);
});

module.exports = app;