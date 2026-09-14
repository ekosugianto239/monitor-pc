const mysql = require('mysql2');

// Kita coba login sebagai user 'gcb' atau 'root' tanpa menembak nama database spesifik dulu
const db = mysql.createConnection({
    host: 'localhost',
    user: 'gcb', // Kita tes user gcb bawaan Cyberindo
    password: '' 
});

db.connect((err) => {
    if (err) {
        console.error('Koneksi Gagal! Error:', err.message);
        return;
    }
    console.log('Koneksi Sukses sebagai user gcb! Mencari daftar seluruh database...');
    
    db.query('SHOW DATABASES', (err, rows) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log(rows);
        }
        db.end();
    });
});