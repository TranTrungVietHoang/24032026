var express = require('express');
var router = express.Router();
let orderModel = require('../schemas/orders');
let { CheckLogin } = require('../utils/authHandler');

// GET /api/v1/orders - Lấy danh sách đơn hàng (Admin: tất cả | User: của mình)
router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let query = { isDeleted: false };
        // Nếu không phải admin thì chỉ lấy đơn của mình
        if (!req.user.role || req.user.role.permissions?.includes('admin') === false) {
            query.user = req.user._id;
        }
        let orders = await orderModel.find(query)
            .populate('user', 'username email fullName')
            .populate('items.product', 'title price images')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/orders/:id - Lấy chi tiết 1 đơn hàng
router.get('/:id', CheckLogin, async function (req, res, next) {
    try {
        let order = await orderModel.findOne({ _id: req.params.id, isDeleted: false })
            .populate('user', 'username email fullName')
            .populate('items.product', 'title price images sku');
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/v1/orders - Tạo đơn hàng mới
router.post('/', CheckLogin, async function (req, res, next) {
    try {
        let { items, shippingAddress, note } = req.body;

        // Tính tổng tiền
        let totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

        let newOrder = new orderModel({
            user: req.user._id,
            items,
            totalAmount,
            shippingAddress,
            note
        });
        await newOrder.save();
        await newOrder.populate('items.product', 'title price images');
        res.status(201).json(newOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT /api/v1/orders/:id - Cập nhật trạng thái đơn hàng
router.put('/:id', CheckLogin, async function (req, res, next) {
    try {
        let order = await orderModel.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: req.body },
            { new: true }
        );
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        res.json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/v1/orders/:id - Xóa mềm đơn hàng
router.delete('/:id', CheckLogin, async function (req, res, next) {
    try {
        let order = await orderModel.findOneAndUpdate(
            { _id: req.params.id },
            { $set: { isDeleted: true } },
            { new: true }
        );
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        res.json({ message: 'Đã xóa đơn hàng', order });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
