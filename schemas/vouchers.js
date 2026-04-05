let mongoose = require('mongoose');

let voucherSchema = mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true, // Tự động in hoa mã code (VD: SALE20)
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percent', 'fixed'], 
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0 // Nếu percent: 0-100, nếu fixed: VND
    },
    minOrderValue: {
        type: Number,
        default: 0 // Đơn tối thiểu để áp mã
    },
    maxDiscountAmount: {
        type: Number,
        default: null // Số tiền giảm tối đa (Áp dụng cho loại percent)
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default: null // Số lượng mã phát ra, null = không giới hạn
    },
    usedCount: {
        type: Number,
        default: 0 // Đã dùng bao nhiêu lần
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = new mongoose.model('voucher', voucherSchema);
