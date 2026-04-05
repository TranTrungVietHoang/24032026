var express = require('express');
var router = express.Router();
let inventoryModel = require('../schemas/inventories');
let { CheckLogin, CheckRole } = require('../utils/authHandler');

// GET /api/v1/inventories - Lấy danh sách tồn kho
router.get('/', async function (req, res, next) {
    try {
        let inventories = await inventoryModel.find()
            .populate({
                path: 'product',
                select: 'title price images slug',
                match: { isDeleted: false }
            });
        
        // Lọc bỏ các bản ghi inventory mà product đã bị soft delete (product = null)
        inventories = inventories.filter(inv => inv.product !== null);
        
        res.json(inventories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/inventories/low-stock - Lấy danh sách hàng sắp cạn (Dashboard)
router.get('/low-stock', CheckLogin, CheckRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
    try {
        let lowInventories = await inventoryModel.find({ stock: { $lt: 5 } })
            .populate({
                path: 'product',
                select: 'title price images slug',
                match: { isDeleted: false }
            })
            .sort({ stock: 1 });
            
        // Lọc bỏ các bản ghi inventory mà product đã bị soft delete (product = null)
        lowInventories = lowInventories.filter(inv => inv.product !== null);
        
        res.json(lowInventories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/inventories/:id - Lấy chi tiết 1 kho theo inventory ID
router.get('/:id', async function (req, res, next) {
    try {
        let inventory = await inventoryModel.findById(req.params.id)
            .populate('product', 'title price images slug');
        if (!inventory) return res.status(404).json({ message: 'Không tìm thấy thông tin kho' });
        res.json(inventory);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/inventories/product/:productId - Lấy tồn kho theo Product ID (Frontend gọi)
router.get('/product/:productId', async function (req, res, next) {
    try {
        let inventory = await inventoryModel.findOne({ product: req.params.productId })
            .populate('product', 'title price images slug');
        if (!inventory) return res.status(404).json({ message: 'Sản phẩm chưa có thông tin kho' });
        res.json(inventory);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/v1/inventories - Tạo mới kho (thường tự động tạo khi tạo Product)
// Endpoint này dùng để tạo thủ công nếu cần
router.post('/', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
    try {
        let { product, stock, reserved, soldCount } = req.body;

        // Kiểm tra product đã có inventory chưa
        let existing = await inventoryModel.findOne({ product });
        if (existing) {
            return res.status(400).json({ message: 'Sản phẩm này đã có trong kho, hãy dùng PUT để cập nhật' });
        }

        let newInventory = new inventoryModel({
            product,
            stock: stock || 0,
            reserved: reserved || 0,
            soldCount: soldCount || 0
        });
        await newInventory.save();
        await newInventory.populate('product', 'title price images');
        res.status(201).json(newInventory);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT /api/v1/inventories/:id - Cập nhật số lượng kho (Admin only)
router.put('/:id', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
    try {
        let inventory = await inventoryModel.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        ).populate('product', 'title price images');

        if (!inventory) return res.status(404).json({ message: 'Không tìm thấy thông tin kho' });
        res.json(inventory);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/v1/inventories/:id - Xóa inventory (Admin only)
// Lưu ý: Thường không xóa inventory, chỉ update stock về 0
router.delete('/:id', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
    try {
        let inventory = await inventoryModel.findByIdAndDelete(req.params.id);
        if (!inventory) return res.status(404).json({ message: 'Không tìm thấy thông tin kho' });
        res.json({ message: 'Đã xóa thông tin kho', inventory });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
