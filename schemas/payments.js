let mongoose = require('mongoose');

let paymentSchema = mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    // Có thể liên kết đến Order hoặc Reservation
    order: {
        type: mongoose.Types.ObjectId,
        ref: 'order',
        default: null
    },
    reservation: {
        type: mongoose.Types.ObjectId,
        ref: 'reservation',
        default: null
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    method: {
        type: String,
        enum: ['cod', 'zalopay', 'momo', 'bank_transfer', 'credit_card'],
        required: true
    },
    // ID giao dịch từ bên thứ 3 (ZaloPay, MoMo...)
    transactionId: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failure', 'refunded'],
        default: 'pending'
    },
    // Response thô từ nhà cung cấp thanh toán
    providerResponse: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    // Mã idempotency để tránh thanh toán trùng lặp
    idempotencyKey: {
        type: String,
        unique: true,
        sparse: true
    },
    pendingAt: { type: Date, default: null },
    paidAt:    { type: Date, default: null },
    failureAt: { type: Date, default: null },
    refundedAt:{ type: Date, default: null },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = new mongoose.model('payment', paymentSchema);