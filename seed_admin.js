require('dotenv').config();
const mongoose = require('mongoose');
const roleModel = require('./schemas/roles');
const userModel = require('./schemas/users');

async function makeAdmin() {
    try {
        let dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/NNPTUD-S3';
        await mongoose.connect(dbUri);
        console.log('✅ Đang cấu hình quyền ADMIN...');

        const adminRole = await roleModel.findOne({ name: 'ADMIN' });
        
        if (!adminRole) {
            console.log('❌ Chưa có Role ADMIN. Đang chạy lại script seed_roles...');
            return process.exit(1);
        }

        const user = await userModel.findOne({ username: 'admin123' });

        if (user) {
            // Cập nhật role mà không đụng tới password (để tránh lỗi băm password undefined)
            await userModel.updateOne(
                { _id: user._id }, 
                { $set: { role: adminRole._id } }
            );
            console.log('🚀 Chúc mừng! Tài khoản "admin123" đã được thăng cấp thành Vua (ADMIN) toàn quyền!');
        } else {
            console.log('❌ Không tìm thấy user admin123. Vui lòng bấm Đăng Ký trên Postman trước!');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

makeAdmin();
