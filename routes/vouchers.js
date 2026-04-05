var express = require('express');
var router = express.Router();
let voucherModel = require('../schemas/vouchers');
let { CheckLogin, CheckRole } = require('../utils/authHandler');

// GET /api/v1/vouchers - Lấy danh sách Voucher (User: Active only, Admin: All)
router.get('/', async function (req, res, next) {
    try {
        let query = { isDeleted: false };
        
        // Cố gắng check token nếu có (để xác định Admin)
        // Nếu FE truyền token thì mới xét quyền, nếu không truyền vẫn lấy được public voucher
        let isAdmin = false;
        if (req.headers.authorization || req.cookies?.LOGIN_NNPTUD_S3) {
            // Giả lập logic gọn để bắt role admin ở đây nếu cần,
            // (Nhưng vì bảo mật, route lấy danh sách public chỉ cho phép xem mã isActive: true, 
             // chưa kết thúc hạn)
        }
        query.isActive = true;
        query.endDate = { $gt: new Date() }; // Mã chưa hết hạn

        let vouchers = await voucherModel.find(query).sort({ endDate: 1 });
        res.json(vouchers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/vouchers/admin - Lấy toàn bộ Voucher (Admin only)
router.get('/admin', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
    try {
        let vouchers = await voucherModel.find({ isDeleted: false }).sort({ createdAt: -1 });
        res.json(vouchers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/vouchers/check/:code - Validate mã xem dùng được cho đơn hàng không
router.get('/check/:code', CheckLogin, async function (req, res, next) {
    try {
        let orderAmount = Number(req.query.amount) || 0;
        let voucher = await voucherModel.findOne({ 
            code: req.params.code.toUpperCase(), 
            isDeleted: false 
        });

        if (!voucher) return res.status(404).json({ success: false, message: 'Mã không tồn tại' });
        if (!voucher.isActive) return res.status(400).json({ success: false, message: 'Mã đã bị khóa' });
        
        let now = new Date();
        if (now < voucher.startDate) return res.status(400).json({ success: false, message: 'Mã chưa đến ngày sử dụng' });
        if (now > voucher.endDate) return res.status(400).json({ success: false, message: 'Mã đã hết hạn' });
        
        if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
            return res.status(400).json({ success: false, message: 'Mã đã hết lượt sử dụng' });
        }
        
        if (orderAmount < voucher.minOrderValue) {
            return res.status(400).json({ 
                success: false, 
                message: `Đơn hàng tối thiểu phải từ ${voucher.minOrderValue} để sử dụng mã này` 
            });
        }

        // Tính toán số tiền sẽ giảm
        let discount = 0;
        if (voucher.discountType === 'percent') {
            discount = (orderAmount * voucher.discountValue) / 100;
            if (voucher.maxDiscountAmount && discount > voucher.maxDiscountAmount) {
                discount = voucher.maxDiscountAmount;
            }
        } else {
            discount = voucher.discountValue; // Kiểu giẩm cố định (fixed)
        }

        res.json({ 
            success: true, 
            message: 'Áp dụng mã thành công',
            discount: discount,
            voucherInfo: voucher
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/v1/vouchers - Admin tạo mã mới
router.post('/', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
    try {
        req.body.code = req.body.code ? req.body.code.toUpperCase() : undefined;
        let newVoucher = new voucherModel(req.body);
        await newVoucher.save();
        res.status(201).json(newVoucher);
    } catch (err) {
        // Lỗi trùng mã code
        if(err.code === 11000) return res.status(400).json({ message: "Mã code này đã tồn tại" });
        res.status(400).json({ message: err.message });
    }
});

// PUT /api/v1/vouchers/:id - Admin sửa mã
router.put('/:id', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
    try {
        if (req.body.code) req.body.code = req.body.code.toUpperCase();
        let voucher = await voucherModel.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: req.body },
            { new: true }
        );
        if (!voucher) return res.status(404).json({ message: 'Không tìm thấy Voucher' });
        res.json(voucher);
    } catch (err) {
        if(err.code === 11000) return res.status(400).json({ message: "Mã code bị trùng lặp" });
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/v1/vouchers/:id - Admin xóa mềm
router.delete('/:id', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
    try {
        let voucher = await voucherModel.findOneAndUpdate(
            { _id: req.params.id },
            { $set: { isDeleted: true, isActive: false } },
            { new: true }
        );
        if (!voucher) return res.status(404).json({ message: 'Không tìm thấy Voucher' });
        res.json({ message: 'Đã xóa Voucher', voucher });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
