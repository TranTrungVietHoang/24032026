require('dotenv').config();
const mongoose = require('mongoose');
const userModel = require('./schemas/users');

async function unlockAdmin() {
    try {
        let dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/NNPTUD-S3';
        await mongoose.connect(dbUri);
        console.log('✅ Kết nối MongoDB thành công!');

        const user = await userModel.findOne({ username: 'admin123' });
        if (!user) {
            console.log('❌ Không tìm thấy user admin123');
            process.exit(1);
        }

        console.log('📋 Trước khi sửa:');
        console.log('  - lockTime:', user.lockTime);
        console.log('  - loginAttempt:', user.loginAttempt);
        console.log('  - isActive:', user.isActive);

        // Xóa lockTime và reset loginAttempt
        await userModel.updateOne(
            { _id: user._id },
            { $set: { lockTime: null, loginAttempt: 0, isActive: true } }
        );

        console.log('🚀 Đã mở khóa admin123 thành công!');
        console.log('   - lockTime: null (đã xóa)');
        console.log('   - loginAttempt: 0 (reset)');
        console.log('   - isActive: true');
        process.exit();
    } catch (err) {
        console.error('❌ Lỗi:', err.message);
        process.exit(1);
    }
}

unlockAdmin();
