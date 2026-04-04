var express = require('express');
var router = express.Router();
let paymentModel = require('../schemas/payments');
let { CheckLogin, CheckRole } = require('../utils/authHandler');

// GET /api/v1/payments - Lấy danh sách thanh toán
// Admin lấy tất cả, User chỉ lấy của mình
router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let query = { isDeleted: false };
        // Nếu không phải ADMIN thì lọc theo user hiện tại
        if (req.user.role && req.user.role.name !== 'ADMIN') {
            query.user = req.user._id;
        }
        let payments = await paymentModel.find(query)
            .populate('user', 'username email fullName')
            .populate('order')
            .populate('reservation')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/payments/:id - Lấy chi tiết 1 thanh toán
router.get('/:id', CheckLogin, async function (req, res, next) {
    try {
        let payment = await paymentModel.findOne({ _id: req.params.id, isDeleted: false })
            .populate('user', 'username email fullName')
            .populate('order')
            .populate('reservation');
        if (!payment) return res.status(404).json({ message: 'Không tìm thấy thanh toán' });
        res.json(payment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/v1/payments - Tạo thanh toán mới
router.post('/', CheckLogin, async function (req, res, next) {
    try {
        let { order, reservation, amount, method, transactionId, idempotencyKey } = req.body;

        // Nếu có idempotencyKey, kiểm tra xem đã tồn tại chưa để tránh duplicate
        if (idempotencyKey) {
            let existing = await paymentModel.findOne({ idempotencyKey });
            if (existing) {
                return res.status(409).json({ message: 'Giao dịch này đã được xử lý', payment: existing });
            }
        }

        let newPayment = new paymentModel({
            user: req.user._id,
            order: order || null,
            reservation: reservation || null,
            amount,
            method,
            transactionId: transactionId || null,
            idempotencyKey: idempotencyKey || null,
            status: 'pending',
            pendingAt: new Date()
        });
        await newPayment.save();
        res.status(201).json(newPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT /api/v1/payments/:id - Cập nhật trạng thái thanh toán (Admin only)
router.put('/:id', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
    try {
        let { status, transactionId, providerResponse } = req.body;
        let updateData = { $set: {} };

        if (status) {
            updateData.$set.status = status;
            // Cập nhật timestamp tương ứng với trạng thái
            if (status === 'paid')     updateData.$set.paidAt = new Date();
            if (status === 'failure')  updateData.$set.failureAt = new Date();
            if (status === 'refunded') updateData.$set.refundedAt = new Date();
        }
        if (transactionId) updateData.$set.transactionId = transactionId;
        if (providerResponse) updateData.$set.providerResponse = providerResponse;

        let payment = await paymentModel.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            updateData,
            { new: true }
        ).populate('user', 'username email fullName');

        if (!payment) return res.status(404).json({ message: 'Không tìm thấy thanh toán' });
        res.json(payment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/v1/payments/:id - Xóa mềm (Admin only)
router.delete('/:id', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
    try {
        let payment = await paymentModel.findOneAndUpdate(
            { _id: req.params.id },
            { $set: { isDeleted: true } },
            { new: true }
        );
        if (!payment) return res.status(404).json({ message: 'Không tìm thấy thanh toán' });
        res.json({ message: 'Đã xóa thanh toán', payment });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
