const mongoose = require('mongoose');
const { importUsersFromExcel } = require('./utils/importHandler');
const path = require('path');

async function verify() {
    try {
        console.log("Đang kết nối MongoDB...");
        await mongoose.connect('mongodb://localhost:27017/NNPTUD-S3');
        console.log("Đã kết nối.");

        const filePath = path.join(__dirname, 'user.xlsx');
        console.log("Bắt đầu dọn dẹp user cũ và import lại từ:", filePath);
        
        // Dọn dẹp user cũ để tránh lỗi trùng lặp (username/email unique)
        await mongoose.model('user').deleteMany({ username: /^user/ });
        console.log("Đã dọn dẹp user cũ.");

        const results = await importUsersFromExcel(filePath);
        
        console.log("Kết quả import:", JSON.stringify(results, null, 2));
        
        console.log("Đang ngắt kết nối...");
        await mongoose.disconnect();
        console.log("Hoàn tất! Hãy kiểm tra Mailtrap của bạn.");
    } catch (err) {
        console.error("Lỗi khi chạy import:", err);
    }
}

verify();
