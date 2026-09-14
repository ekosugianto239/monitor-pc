const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data.s3db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) return console.error(err.message);
});

// Mengintip isi data PC saat ini
const query = "SELECT Name, Status, LoginTimeStamp, ActiveTime FROM tbl_Computer ORDER BY Name ASC";

db.all(query, [], (err, rows) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log("=== KONDISI REALTIME DATABASE DISKLESS ===");
    console.table(rows);
    db.close();
});