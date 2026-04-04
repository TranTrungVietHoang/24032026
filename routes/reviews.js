var express = require('express');
var router = express.Router();
let reviewModel = require('../schemas/reviews');
let { CheckLogin } = require('../utils/authHandler');

// GET /api/v1/reviews?productId=xxx - Lấy danh sách review theo sản phẩm
router.get('/', async function (req, res, next) {
    try {
        let query = { isDeleted: false };
        if (req.query.productId) query.product = req.query.productId;

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

// POST /api/v1/reviews - Tạo review mới (Cần đăng nhập)
router.post('/', CheckLogin, async function (req, res, next) {
    try {
        let { product, rating, comment, images } = req.body;

        // Kiểm tra user đã review sản phẩm này chưa
        let existing = await reviewModel.findOne({
            user: req.user._id,
            product: product,
            isDeleted: false
        });
        if (existing) {
            return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi' });
        }

        let newReview = new reviewModel({
            user: req.user._id,
            product,
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

module.exports = router;
