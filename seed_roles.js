require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('./schemas/roles');

async function seedRoles() {
    try {
        let dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/NNPTUD-S3';
        await mongoose.connect(dbUri);
        console.log('✅ Đang kết nối MongoDB để khởi tạo Role...');

        const roles = [
            { name: 'ADMIN', description: 'Quản trị viên toàn quyền hệ thống' },
            { name: 'USER', description: 'Người dùng mua hàng thông thường' },
            { name: 'MODERATOR', description: 'Nhân viên quản lý sản phẩm và đơn hàng' }
        ];

        for (let roleData of roles) {
            const exists = await Role.findOne({ name: roleData.name });
            if (!exists) {
                await Role.create(roleData);
                console.log(`+ Đã tạo Role: ${roleData.name}`);
            } else {
                console.log(`- Role ${roleData.name} đã tồn tại, bỏ qua.`);
            }
        }

        console.log('🏁 Hoàn tất khởi tạo Role!');
        process.exit();
    } catch (err) {
        console.error('❌ Lỗi khởi tạo:', err);
        process.exit(1);
    }
}

seedRoles();
