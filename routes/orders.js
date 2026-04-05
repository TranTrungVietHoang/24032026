var express = require('express');
var router = express.Router();
let orderModel = require('../schemas/orders');
let inventoryModel = require('../schemas/inventories');
let notificationModel = require('../schemas/notifications');
let cartModel = require('../schemas/carts');
let voucherModel = require('../schemas/vouchers');
let { CheckLogin, CheckRole } = require('../utils/authHandler');

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
        let { items, shippingAddress, note, voucherCode } = req.body;

        // BƯỚC 1: QUÉT KIỂM TRA TOÀN BỘ GIỎ HÀNG XEM CÒN ĐỦ HÀNG TRONG KHO KHÔNG
        for (let item of items) {
            let invCheck = await inventoryModel.findOne({ product: item.product });
            if (!invCheck || invCheck.stock < item.quantity) {
                return res.status(400).json({ 
                    success: false,
                    message: `Sản phẩm có ID ${item.product} hiện tại chỉ còn ${invCheck ? invCheck.stock : 0} trong kho. Không đủ số lượng bạn yêu cầu!` 
                });
            }
        }

        // BƯỚC 2: Tính tổng tiền, trừ stock kho và kiểm tra ngưỡng an toàn báo cháy
        let totalAmount = 0;
        for (let item of items) {
            totalAmount += item.subtotal;
            
            // Trừ lượng tồn kho, tăng lượt bán
            let inv = await inventoryModel.findOneAndUpdate(
                { product: item.product },
                { $inc: { stock: -item.quantity, soldCount: item.quantity } },
                { new: true }
            );
            
            // Nếu stock rơi xuống dưới 5 cái -> Còi báo động Thông báo cho Admin!
            if (inv && inv.stock < 5) {
                await notificationModel.create({
                    user: null, // Gửi cho mọi ADMIN
                    title: "⚠️ Cảnh báo sắp hết hàng",
                    content: `Sản phẩm có ID ${item.product} vừa xuất kho. Hiện hệ thống chỉ còn ${inv.stock} cái!`,
                    type: 'system'
                });
            }
        }

        // BƯỚC 3: Xử lý Voucher (Nếu có)
        let discount = 0;
        if (voucherCode) {
            let voucher = await voucherModel.findOne({ 
                code: voucherCode.toUpperCase(), 
                isDeleted: false, 
                isActive: true 
            });
            if (voucher && new Date() >= voucher.startDate && new Date() <= voucher.endDate && totalAmount >= voucher.minOrderValue) {
                if (voucher.discountType === 'percent') {
                     discount = (totalAmount * voucher.discountValue) / 100;
                     if (voucher.maxDiscountAmount && discount > voucher.maxDiscountAmount) {
                         discount = voucher.maxDiscountAmount;
                     }
                } else {
                     discount = voucher.discountValue;
                }
                
                // Trừ đi 1 lượt sử dụng của Voucher
                voucher.usedCount += 1;
                if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
                    voucher.isActive = false; // Automatically lock if limit reached
                }
                await voucher.save();
            }
        }
        
        // Khấu trừ Voucher vào đơn (không để âm)
        totalAmount = Math.max(0, totalAmount - discount);

        let newOrder = new orderModel({
            user: req.user._id,
            items,
            totalAmount,
            shippingAddress,
            note
        });
        await newOrder.save();

        // BƯỚC 4: Dọn dẹp Giỏ Hàng tự động (Chỉ xóa những ID vừa thanh toán)
        let cart = await cartModel.findOne({ user: req.user._id });
        if (cart && cart.products) {
            let purchasedProductIds = items.map(item => item.product.toString());
            cart.products = cart.products.filter(
                cartItem => !purchasedProductIds.includes(cartItem.product.toString())
            );
            await cart.save();
        }

        await newOrder.populate('items.product', 'title price images');
        res.status(201).json(newOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT /api/v1/orders/:id - Cập nhật trạng thái đơn hàng (Admin/Moderator)
router.put('/:id', CheckLogin, CheckRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
    try {
        let order = await orderModel.findOne({ _id: req.params.id, isDeleted: false });
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

        // BƯỚC 5: Logic Hoàn Kho khi có Lệnh "Hủy Đơn"
        if (req.body.status === 'cancelled' && order.status !== 'cancelled') {
            for (let item of order.items) {
                await inventoryModel.findOneAndUpdate(
                    { product: item.product },
                    { $inc: { stock: item.quantity, soldCount: -item.quantity } } // Cộng lại kho, trừ lượng đã bán ảo đi
                );
            }
            
            // Có thể báo Notification bắn cho Tới User rằng "Đơn hàng của bạn đã bị hủy và hoàn trả"
            await notificationModel.create({
                user: order.user,
                title: "❌ Đơn hàng đã bị hủy",
                content: `Đơn hàng mang mã ${order._id} của bạn đã bị từ chối/hủy bỏ. Xin lỗi vì sự bất tiện này.`,
                type: 'order'
            });
        }

        // BƯỚC 6: Thông báo khi đơn hàng đã cập nhật thành công (Đã Giao)
        if (req.body.status === 'delivered' && order.status !== 'delivered') {
            await notificationModel.create({
                user: order.user,
                title: "✅ Giao hàng thành công",
                content: `Đơn hàng mang mã ${order._id} của bạn đã lấy giao đến nơi. Mong bạn hài lòng với sản phẩm!`,
                type: 'order'
            });
        }

        // Cập nhật các trường còn lại
        let keys = Object.keys(req.body);
        for(let key of keys){
            order[key] = req.body[key];
        }
        await order.save();

        res.json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/v1/orders/:id - Xóa mềm đơn hàng (Admin only)
router.delete('/:id', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
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
