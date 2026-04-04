let mongoose = require('mongoose');

// Chi tiết từng sản phẩm trong đơn hàng
let orderItemSchema = mongoose.Schema({
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    }
});

let orderSchema = mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: {
        type: [orderItemSchema],
        default: []
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    shippingAddress: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true }
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
        default: 'pending'
    },
    note: {
        type: String,
        default: ''
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = new mongoose.model('order', orderSchema);
