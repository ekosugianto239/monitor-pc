const fs = require('fs');
const path = require('path');

// Mengarah langsung ke folder backup di Flashdisk kamu
const filePath = 'E:\\GCB_2026-07-19_08-24\\Main.gbsdat';

if (!fs.existsSync(filePath)) {
    console.error(`File tidak ditemukan di jalur: ${filePath}`);
    console.error("Pastikan Flashdisk masih tercolok di Drive E.");
    process.exit(1);
}

console.log("Memulai pembedahan file Main.gbsdat langsung dari Flashdisk...");

fs.readFile(filePath, (err, data) => {
    if (err) return console.error(err);

    // Mengubah buffer biner menjadi string teks yang bisa dibaca manusia
    const teksMentah = data.toString('binary');
    
    // Kita cari posisi PC 'ONI-01' di dalam file biner tersebut
    const targetPC = 'ONI-01';
    const index = teksMentah.indexOf(targetPC);

    if (index === -1) {
        console.log(`PC ${targetPC} tidak terdeteksi dalam data mentah.`);
        
        // Tampilkan potongan teks 500 karakter pertama untuk melihat polanya
        console.log("\n500 Karakter pertama file:");
        console.log(teksMentah.substring(0, 500).replace(/[^\x20-\x7E]/g, '.'));
    } else {
        console.log(`\n[KETEMU] PC ${targetPC} berada di posisi biner ke-${index}`);
        
        // Ambil data 150 karakter di sekitar nama PC tersebut untuk melihat data billingnya
        const start = Math.max(0, index - 20);
        const potongan = teksMentah.substring(start, start + 150);
        
        console.log("Struktur data di sekitarnya (Karakter aneh diubah jadi titik):");
        console.log(potongan.replace(/[^\x20-\x7E]/g, '.'));
    }
});