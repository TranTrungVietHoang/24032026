var express = require('express');
var router = express.Router();
let reviewModel = require('../schemas/reviews');
let { CheckLogin, CheckRole } = require('../utils/authHandler');

// GET /api/v1/reviews?productId=xxx - Lấy danh sách review theo sản phẩm
router.get('/', async function (req, res, next) {
    try {
        let query = { isDeleted: false };
        if (req.query.productId) query.product = req.query.productId;

        // Nếu không là admin thì chỉ lấy review không bị ẩn
        if (!req.user || req.user.role?.name !== 'ADMIN') {
            query.isHidden = false;
        }

        let reviews = await reviewModel.find(query)
            .populate('user', 'username fullName avatarUrl')
            .populate('product', 'title')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/reviews/product/:productId - Lấy danh sách review theo sản phẩm (Frontend gọi kiểu này)
router.get('/product/:productId', async function (req, res, next) {
    try {
        let query = { 
            product: req.params.productId, 
            isDeleted: false 
        };

        // Nếu không là admin thì chỉ lấy review không bị ẩn
        if (!req.user || req.user.role?.name !== 'ADMIN') {
            query.isHidden = false;
        }

        let reviews = await reviewModel.find(query)
            .populate('user', 'username fullName avatarUrl')
            .populate('product', 'title')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/reviews/:id - Lấy chi tiết 1 review
router.get('/:id', async function (req, res, next) {
    try {
        let review = await reviewModel.findOne({ _id: req.params.id, isDeleted: false })
            .populate('user', 'username fullName avatarUrl')
            .populate('product', 'title images');
        if (!review) return res.status(404).json({ message: 'Không tìm thấy review' });
        res.json(review);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/v1/reviews - Tạo review mới (Cần mua hàng thành công)
router.post('/', CheckLogin, async function (req, res, next) {
    try {
        let { product, rating, comment, images, orderId } = req.body;

        if (!orderId) {
             return res.status(400).json({ message: 'Thiếu mã đơn hàng để đánh giá' });
        }

        // 1. Kiểm tra đơn hàng có đúng của user, có chứa sản phẩm, và đã giao chưa
        const order = await require('../schemas/orders').findOne({
            _id: orderId,
            user: req.user._id,
            'items.product': product,
            status: 'delivered',
            isDeleted: false
        });

        if (!order) {
            return res.status(400).json({ message: 'Bạn chỉ có thể đánh giá sản phẩm từ đơn hàng đã giao thành công' });
        }

        // 2. Kiểm tra xem đơn hàng này đã được đánh giá cho sản phẩm này chưa
        let existing = await reviewModel.findOne({
            order: orderId,
            product: product,
            isDeleted: false
        });
        if (existing) {
            return res.status(400).json({ message: 'Đơn hàng này đã được đánh giá rồi' });
        }

        let newReview = new reviewModel({
            user: req.user._id,
            product,
            order: orderId,
            rating,
            comment,
            images
        });
        await newReview.save();
        await newReview.populate('user', 'username fullName avatarUrl');
        res.status(201).json(newReview);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT /api/v1/reviews/:id - Cập nhật review (chỉ chủ review)
router.put('/:id', CheckLogin, async function (req, res, next) {
    try {
        let review = await reviewModel.findOne({ _id: req.params.id, isDeleted: false });
        if (!review) return res.status(404).json({ message: 'Không tìm thấy review' });

        // Chỉ cho phép chủ review sửa
        if (review.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Không có quyền sửa review này' });
        }

        Object.assign(review, req.body);
        await review.save();
        res.json(review);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/v1/reviews/:id - Xóa mềm review
router.delete('/:id', CheckLogin, async function (req, res, next) {
    try {
        let review = await reviewModel.findOne({ _id: req.params.id, isDeleted: false });
        if (!review) return res.status(404).json({ message: 'Không tìm thấy review' });

        if (review.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Không có quyền xóa review này' });
        }

        review.isDeleted = true;
        await review.save();
        res.json({ message: 'Đã xóa review' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/v1/reviews/:id/toggle - Ẩn/Hiện review (Admin only)
router.patch('/:id/toggle', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
    try {
        let review = await reviewModel.findOne({ _id: req.params.id });
        if (!review) return res.status(404).json({ message: 'Không tìm thấy review' });

        review.isHidden = !review.isHidden;
        await review.save();
        res.json({ message: `Đã ${review.isHidden ? 'ẩn' : 'hiện'} đánh giá`, review });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v1/reviews/check-eligibility/:productId - Kiểm tra user có đơn hàng nào chưa đánh giá không
router.get('/check-eligibility/:productId', CheckLogin, async function (req, res, next) {
    try {
        const orderModel = require('../schemas/orders');
        
        // Tìm đơn hàng đã giao có chứa sản phẩm này
        const deliveredOrders = await orderModel.find({
            user: req.user._id,
            'items.product': req.params.productId,
            status: 'delivered',
            isDeleted: false
        }).select('_id');

        if (deliveredOrders.length === 0) {
            return res.json({ eligible: false, message: 'Bạn cần mua và nhận hàng thành công để đánh giá' });
        }

        // Kiểm tra xem đơn hàng nào trong số đó chưa được đánh giá
        for (let order of deliveredOrders) {
            const hasReview = await reviewModel.findOne({
                order: order._id,
                product: req.params.productId,
                isDeleted: false
            });
            if (!hasReview) {
                return res.json({ eligible: true, orderId: order._id });
            }
        }

        res.json({ eligible: false, message: 'Bạn đã đánh giá cho tất cả các lần mua sản phẩm này' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
