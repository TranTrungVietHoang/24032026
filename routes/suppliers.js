var express = require('express');
var router = express.Router();
let supplierModel = require('../schemas/suppliers');
let { CheckLogin, CheckRole } = require('../utils/authHandler');

// GET /api/v1/suppliers - Lấy danh sách NCC
// Chỉ Admin hoặc Manager mới được quyền thao tác Nhà cung cấp
router.get('/', CheckLogin, CheckRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
    try {
        let suppliers = await supplierModel.find({ isDeleted: false }).sort({ createdAt: -1 });
        res.json(suppliers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/suppliers/:id - Chi tiết NCC
router.get('/:id', CheckLogin, CheckRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
    try {
        let supplier = await supplierModel.findOne({ _id: req.params.id, isDeleted: false });
        if (!supplier) return res.status(404).json({ message: 'Không tìm thấy Nhà cung cấp' });
        res.json(supplier);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/v1/suppliers - Tạo mới NCC
router.post('/', CheckLogin, CheckRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
    try {
        let newSupplier = new supplierModel(req.body);
        await newSupplier.save();
        res.status(201).json(newSupplier);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT /api/v1/suppliers/:id - Sửa thông tin NCC
router.put('/:id', CheckLogin, CheckRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
    try {
        let supplier = await supplierModel.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: req.body },
            { new: true }
        );
        if (!supplier) return res.status(404).json({ message: 'Không tìm thấy Nhà cung cấp' });
        res.json(supplier);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/v1/suppliers/:id - Xóa mềm NCC
router.delete('/:id', CheckLogin, CheckRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
    try {
        let supplier = await supplierModel.findOneAndUpdate(
            { _id: req.params.id },
            { $set: { isDeleted: true, isActive: false } },
            { new: true }
        );
        if (!supplier) return res.status(404).json({ message: 'Không tìm thấy Nhà cung cấp' });
        res.json({ message: 'Đã xóa Nhà cung cấp', supplier });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
