var express = require('express');
var router = express.Router();
let notificationModel = require('../schemas/notifications');
let { CheckLogin, CheckRole } = require('../utils/authHandler');

// GET /api/v1/notifications - Lấy thông báo của user hiện tại
router.get('/', CheckLogin, async function (req, res, next) {
    try {
        // Lấy thông báo của user đó HOẶC thông báo hệ thống (user: null)
        let notifications = await notificationModel.find({
            $or: [{ user: req.user._id }, { user: null }],
            isDeleted: false
        }).sort({ createdAt: -1 });
        
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/notifications/unread-count - Lấy đếm số thông báo chưa đọc
router.get('/unread-count', CheckLogin, async function (req, res, next) {
    try {
        let count = await notificationModel.countDocuments({
            $or: [{ user: req.user._id }, { user: null }],
            isRead: false,
            isDeleted: false
        });
        res.json({ unreadCount: count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/v1/notifications/read-all - Đánh dấu tất cả là đã đọc
router.put('/read-all', CheckLogin, async function (req, res, next) {
    try {
        await notificationModel.updateMany(
            { 
                $or: [{ user: req.user._id }, { user: null }], 
                isRead: false, 
                isDeleted: false 
            },
            { $set: { isRead: true } }
        );
        res.json({ success: true, message: "Đã đánh dấu tất cả là đã đọc" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/v1/notifications/:id/read - Đánh dấu 1 tin là đã đọc
router.put('/:id/read', CheckLogin, async function (req, res, next) {
    try {
        let noti = await notificationModel.findOneAndUpdate(
            { 
                _id: req.params.id, 
                $or: [{ user: req.user._id }, { user: null }] 
            },
            { $set: { isRead: true } },
            { new: true }
        );
        res.json(noti);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/v1/notifications - Admin đẩy thông báo thủ công
router.post('/', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
    try {
        let newNoti = new notificationModel(req.body);
        await newNoti.save();
        res.status(201).json(newNoti);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
