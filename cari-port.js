const { exec } = require('child_process');

console.log("Mencari proses Cyberindo Billing yang sedang berjalan...");

// Perintah untuk melihat aplikasi yang menggunakan port jaringan di Windows
exec('netstat -ano | findstr :3306', (err, stdout) => {
    if (err || !stdout) {
        console.log("\n[INFO] MySQL tidak terdeteksi di port default 3306.");
        console.log("Mencari port alternatif untuk gcbServer...");
        
        exec('tasklist | findstr gcbServer', (err2, stdout2) => {
            if (stdout2) {
                console.log("Aplikasi gcbServer.exe AKTIF. Berikut detailnya:");
                console.log(stdout2);
            } else {
                console.log("Aplikasi gcbServer.exe tidak sedang berjalan di PC ini.");
            }
        });
        return;
    }
    
    console.log("\n[KETEMU] Port MySQL Aktif:");
    console.log(stdout);
    console.log("Silakan cek PID (angka paling kanan) di atas pada Task Manager untuk memastikan pemiliknya.");
});