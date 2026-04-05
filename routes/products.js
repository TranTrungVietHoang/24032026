const express = require('express')
let router = express.Router()
let slugify = require('slugify')
let productSchema = require('../schemas/products')
let inventorySchema = require('../schemas/inventories')
let mongoose = require('mongoose')
let { CheckLogin, CheckRole } = require('../utils/authHandler');

router.get('/', async (req, res) => {
    let queries = req.query;
    let minQ = queries.min ? queries.min : 0;
    let result = await productSchema.find({
        isDeleted: false,
        price: {
            $gte: minQ
        }
    }).populate(
        { path: 'category', select: 'name' }
    )
    res.send(result)
})
router.get('/:id', async (req, res) => {//req.params
    try {
        let result = await productSchema.findOne({
            isDeleted: false,
            _id: req.params.id
        })
        if (result) {
            res.send(result)
        } else {
            res.status(404).send({
                message: "ID NOT FOUND"
            })
        }
    } catch (error) {
        res.status(404).send({
            message: "SOMETHING WENT WRONG"
        })
    }
})
router.post('/', CheckLogin, CheckRole('ADMIN', 'MODERATOR'), async (req, res) => {
    if (!req.body.category) {
        return res.status(400).json({ message: "Vui lòng chọn Danh mục (Category) cho sản phẩm!" });
    }
    let session = await mongoose.startSession();
    session.startTransaction();
    try {
        let newProducts = new productSchema({
            sku: req.body.sku || ('SKU-' + Date.now()),
            title: req.body.title,
            slug: slugify(req.body.title, {
                replacement: '-',
                lower: false,
                remove: undefined,
            }),
            description: req.body.description,
            category: req.body.category || null,
            images: req.body.images || [],
            price: req.body.price
        })
        await newProducts.save({ session })
        console.log(newProducts);
        let newInventory = new inventorySchema({
            product: newProducts._id,
            stock: 0
        })
        await newInventory.save({ session });
        await newInventory.populate('product')
        
        await session.commitTransaction();
        await session.endSession();
        res.send(newInventory)
    } catch (error) {
        await session.abortTransaction();
        await session.endSession();
        res.status(400).send(error.message)
    }
})
router.put('/:id', CheckLogin, CheckRole('ADMIN', 'MODERATOR'), async (req, res) => {
    try {
        let result = await productSchema.findOne({
            isDeleted: false,
            _id: req.params.id
        })
        if (result) {
            let keys = Object.keys(req.body);
            for (const key of keys) {
                result[key] = req.body[key]
            }
            await result.save();
            res.json(result); // FIX: trả về kết quả sau khi lưu
        } else {
            res.status(404).send({
                message: "ID NOT FOUND"
            })
        }
    } catch (error) {
        res.status(404).send({
            message: "SOMETHING WENT WRONG"
        })
    }
})
router.delete('/:id', CheckLogin, CheckRole('ADMIN'), async (req, res) => {
    try {
        let result = await productSchema.findOne({
            isDeleted: false,
            _id: req.params.id
        })
        if (result) {
            result.isDeleted = true;
            await result.save();
        } else {
            res.status(404).send({
                message: "ID NOT FOUND"
            })
        }
    } catch (error) {
        res.status(404).send({
            message: "SOMETHING WENT WRONG"
        })
    }

})

module.exports = router;