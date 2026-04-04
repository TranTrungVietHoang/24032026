var express = require('express');
var router = express.Router();
let reservationModel = require('../schemas/reservations');
let { CheckLogin } = require('../utils/authHandler');

// GET /api/v1/reservations - Lấy danh sách đặt trước của user
router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let reservations = await reservationModel.find({
            user: req.user._id,
            isDeleted: false
        })
            .populate('user', 'username email fullName')
            .populate('items.product', 'title price images')
            .sort({ createdAt: -1 });
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/reservations/:id - Chi tiết 1 đặt trước
router.get('/:id', CheckLogin, async function (req, res, next) {
    try {
        let reservation = await reservationModel.findOne({ _id: req.params.id, isDeleted: false })
            .populate('user', 'username email fullName')
            .populate('items.product', 'title price images sku');
        if (!reservation) return res.status(404).json({ message: 'Không tìm thấy đặt trước' });
        res.json(reservation);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/v1/reservations - Tạo đặt trước mới
router.post('/', CheckLogin, async function (req, res, next) {
    try {
        let { items, note } = req.body;

        let totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

        let newReservation = new reservationModel({
            user: req.user._id,
            items,
            totalAmount,
            note
        });
        await newReservation.save();
        await newReservation.populate('items.product', 'title price images');
        res.status(201).json(newReservation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT /api/v1/reservations/:id - Cập nhật trạng thái đặt trước
router.put('/:id', CheckLogin, async function (req, res, next) {
    try {
        let reservation = await reservationModel.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: req.body },
            { new: true }
        );
        if (!reservation) return res.status(404).json({ message: 'Không tìm thấy đặt trước' });
        res.json(reservation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/v1/reservations/:id - Hủy đặt trước
router.delete('/:id', CheckLogin, async function (req, res, next) {
    try {
        let reservation = await reservationModel.findOneAndUpdate(
            { _id: req.params.id },
            { $set: { isDeleted: true, status: 'cancelled' } },
            { new: true }
        );
        if (!reservation) return res.status(404).json({ message: 'Không tìm thấy đặt trước' });
        res.json({ message: 'Đã hủy đặt trước', reservation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
