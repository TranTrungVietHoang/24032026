let mongoose = require('mongoose');

let notificationSchema = mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: false, // Bỏ trống nếu muốn gửi thông báo cho tất cả (Broadcast)
        default: null
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['system', 'order', 'promotion'], 
        default: 'system'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    link: {
        type: String,
        default: '' // VD: /orders/12344 để FE nhấn vào chuyển trang
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = new mongoose.model('notification', notificationSchema);
