const fs = require('fs');
const path = require('path');

// Mengarah ke folder GBillingServer di Flashdisk kamu (Drive E)
const folderPath = 'E:\\GBillingServer';

function cariTeksDiFile(filePath) {
    try {
        const data = fs.readFileSync(filePath);
        // Ubah buffer ke string dan bersihkan karakter non-printable
        const teks = data.toString('ascii').replace(/[^\x20-\x7E\t\r\n]/g, ' ');
        
        // Cari pola kata kunci yang biasa berdekatan dengan password
        if (teks.includes('icafe') || teks.includes('billing') || teks.includes('Database')) {
            console.log(`\n[ANALISIS] Menemukan kecocokan di file: ${filePath}`);
            
            // Ambil potongan teks sekitarnya
            const index = teks.indexOf('Database');
            const start = Math.max(0, index - 100);
            console.log("Potongan teks konfig:");
            console.log(teks.substring(start, start + 300).trim().replace(/\s+/g, ' '));
        }
    } catch (e) {
        // Lewati jika file tidak bisa dibaca
    }
}

function telusuri(dir) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    list.forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            telusuri(fullPath);
        } else if (item.endsWith('.ini') || item.endsWith('.conf') || item.endsWith('.txt')) {
            cariTeksDiFile(fullPath);
        }
    });
}

console.log("Memulai pemindaian teks tersembunyi...");
telusuri(folderPath);
console.log("Pemindaian selesai.");