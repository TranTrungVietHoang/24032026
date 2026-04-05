require('dotenv').config();
const mongoose = require('mongoose');
const cartSchema = require('./schemas/carts');
const userModel = require('./schemas/users');

async function createCart() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Kết nối MongoDB thành công!');

        const user = await userModel.findOne({ username: 'admin123' });
        if (!user) { console.log('❌ Không tìm thấy admin123'); process.exit(1); }

        const existing = await cartSchema.findOne({ user: user._id });
        if (existing) {
            console.log('✅ admin123 đã có cart rồi, ID:', existing._id);
        } else {
            const newCart = new cartSchema({ user: user._id });
            await newCart.save();
            console.log('🚀 Đã tạo cart cho admin123, ID:', newCart._id);
        }
        process.exit();
    } catch (err) {
        console.error('❌ Lỗi:', err.message);
        process.exit(1);
    }
}
createCart();
