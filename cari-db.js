const fs = require('fs');
const path = require('path');

// Mengarah ke folder GBillingServer di Flashdisk (Drive E)
const targetDir = 'E:\\GBillingServer'; 

function scanFolder(dir) {
    if (!fs.existsSync(dir)) return console.log(`Folder ${dir} tidak ditemukan.`);
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            scanFolder(fullPath); // Telusuri subfolder
        } else if (file.endsWith('.ini') || file.endsWith('.cfg')) {
            // Baca isi file .ini untuk mencari teks database
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('pass') || content.includes('Pass') || content.includes('db') || content.includes('DB')) {
                console.log(`\n[KETEMU KANDIDAT] DI FILE: ${fullPath}`);
                console.log(content.trim().substring(0, 500)); // Tampilkan 500 karakter pertama
            }
        }
    });
}

console.log('Memulai pemindaian folder GBillingServer di FD...');
scanFolder(targetDir);
console.log('Pemindaian selesai.');