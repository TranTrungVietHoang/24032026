var express = require("express");
var router = express.Router();
let { CheckLogin } = require('../utils/authHandler')
let cartSchema = require('../schemas/carts')
let inventorySchema = require('../schemas/inventories')

router.get('/', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let cart = await cartSchema.findOne({
        user: user._id
    })
    res.send(cart)
})
router.post('/add', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let productId = req.body.product;
    let quantity = parseInt(req.body.quantity) || 1;

    let cart = await cartSchema.findOne({
        user: user._id
    })
    let product = await inventorySchema.findOne({
        product: productId
    })
    if (!product) {
        res.status(404).send({
            message: "san pham khong ton tai"
        });
        return;
    }
    let stock = product.stock;
    let index = cart.products.findIndex(
        function (e) {
            return e.product == productId
        })
    if (index == -1) {
        if (stock < 1) {
            res.status(404).send({
                message: "san pham trong kho khong du"
            });
            return;
        }
        cart.products.push({
            product: productId,
            quantity: quantity
        })
    } else {
        if (stock - cart.products[index].quantity < quantity) {
            res.status(404).send({
                message: "san pham trong kho khong du"
            });
            return;
        }
        cart.products[index].quantity += quantity
    }
    await cart.save();
    res.send(cart)
})
router.post('/remove', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let productId = req.body.product;
    let cart = await cartSchema.findOne({
        user: user._id
    })
    let product = await inventorySchema.findOne({
        product: productId
    })
    if (!product) {
        res.status(404).send({
            message: "san pham khong ton tai"
        });
        return;
    }
    let index = cart.products.findIndex(
        function (e) {
            return e.product == productId
        })
    if (index == -1) {
        res.status(404).send({
            message: "san pham khong ton tai"
        });
        return;
    } else {
        cart.products.splice(index, 1)
    }
    await cart.save();
    res.send(cart)
})
router.post('/decrease', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let productId = req.body.product;
    let cart = await cartSchema.findOne({
        user: user._id
    })
    let product = await inventorySchema.findOne({
        product: productId
    })
    if (!product) {
        res.status(404).send({
            message: "san pham khong ton tai"
        });
        return;
    }
    let index = cart.products.findIndex(
        function (e) {
            return e.product == productId
        })
    if (index == -1) {
        res.status(404).send({
            message: "san pham khong ton tai"
        });
        return;
    } else {
        if (cart.products[index].quantity == 1) {
            cart.products.splice(index, 1);
        } else {
            cart.products[index].quantity -= 1;
        }
    }
    await cart.save();
    res.send(cart)
})

router.post('/modify', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let productId = req.body.product;
    let quantity = req.body.quantity;

    let cart = await cartSchema.findOne({
        user: user._id
    })
    let product = await inventorySchema.findOne({
        product: productId
    })
    if (!product) {
        res.status(404).send({
            message: "san pham khong ton tai"
        });
        return;
    }
    let stock = product.stock;
    let index = cart.products.findIndex(
        function (e) {
            return e.product == productId
        })
    if (index == -1) {
        res.status(404).send({
            message: "san pham khong ton tai trong gio hang"
        });
        return;
    } else {
        if (stock - quantity < 0) {
            res.status(404).send({
                message: "san pham trong kho khong du"
            });
            return;
        }
        cart.products[index].quantity = quantity
    }
    await cart.save();
    res.send(cart)
})

// GET /api/v1/carts/:id - Lấy cart theo Cart ID (dùng cho admin)
router.get('/:id', CheckLogin, async function (req, res, next) {
    try {
        let cart = await cartSchema.findById(req.params.id)
            .populate('user', 'username email fullName')
            .populate('products.product', 'title price images');
        if (!cart) return res.status(404).json({ message: 'Không tìm thấy giỏ hàng' });
        res.json(cart);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

// DELETE /api/v1/carts/:id - Xóa toàn bộ sản phẩm trong cart (clear giỏ hàng)
router.delete('/:id', CheckLogin, async function (req, res, next) {
    try {
        let cart = await cartSchema.findById(req.params.id);
        if (!cart) return res.status(404).json({ message: 'Không tìm thấy giỏ hàng' });

        // Chỉ được xóa cart của chính mình
        if (cart.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Không có quyền xóa giỏ hàng này' });
        }

        cart.products = [];
        await cart.save();
        res.json({ message: 'Đã xóa toàn bộ sản phẩm trong giỏ hàng', cart });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

module.exports = router;