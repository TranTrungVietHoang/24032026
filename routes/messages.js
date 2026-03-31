var express = require('express');
var router = express.Router();
let messageModel = require('../schemas/messages');
let { CheckLogin } = require('../utils/authHandler');
let mongoose = require('mongoose');

// GET "/" lấy message cuối cùng của mỗi user mà user hiện tại nhắn tin hoặc user khác nhắn cho user hiện tại
router.get('/', CheckLogin, async function (req, res, next) {
    try {
        const currentUserId = req.user._id;

        // Grouping to get the last message for each conversation
        const lastMessages = await messageModel.aggregate([
            {
                $match: {
                    $or: [
                        { from: currentUserId },
                        { to: currentUserId }
                    ]
                }
            },
            {
                $sort: { createdAt: -1 } // Sắp xếp theo ngày tạo mới nhất để lấy tin nhắn cuối
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$from", currentUserId] },
                            "$to",
                            "$from"
                        ]
                    },
                    lastMessage: { $first: "$$ROOT" }
                }
            },
            {
                $replaceRoot: { newRoot: "$lastMessage" }
            },
            {
                $sort: { createdAt: -1 } // Sắp xếp các đoạn chat để đoạn có tin nhắn mới nhất lên đầu
            }
        ]);

        // Populate users thông qua populate của mongoose
        const populatedMessages = await messageModel.populate(lastMessages, [
            { path: 'from', select: 'username fullName avatarUrl' },
            { path: 'to', select: 'username fullName avatarUrl' }
        ]);

        res.status(200).send({ success: true, data: populatedMessages });
    } catch (error) {
        res.status(400).send({ success: false, message: error.message });
    }
});

// POST "/" - post nội dung bao gồm:
// - nếu có chứa file thì type là file,text là path dẫn đến file, nếu là text thì type là text  và text là nội dung gửi
// - to: userID sẽ gửi đến
router.post('/', CheckLogin, async function (req, res, next) {
    try {
        const currentUserId = req.user._id;
        const { to, type, text } = req.body;

        if (!to || !text) {
            return res.status(400).send({ 
                success: false, 
                message: "Missing either 'to' or 'text' in the request." 
            });
        }

        if (!mongoose.Types.ObjectId.isValid(to)) {
            return res.status(400).send({ success: false, message: "Invalid user ID." });
        }

        const newMessage = new messageModel({
            from: currentUserId,
            to: to,
            messageContent: {
                type: type === 'file' ? 'file' : 'text',
                text: text
            }
        });

        await newMessage.save();
        await newMessage.populate('from', 'username fullName avatarUrl');
        await newMessage.populate('to', 'username fullName avatarUrl');

        res.status(201).send({ success: true, data: newMessage });
    } catch (error) {
        res.status(400).send({ success: false, message: error.message });
    }
});

// GET "/:userID" - ( lấy toàn bộ message from: user hiện tại, to :userID và from: userID và to:user hiện tại )
router.get('/:userID', CheckLogin, async function (req, res, next) {
    try {
        const currentUserId = req.user._id;
        const targetUserId = req.params.userID;

        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).send({ message: "Invalid user ID" });
        }

        const messages = await messageModel.find({
            $or: [
                { from: currentUserId, to: targetUserId },
                { from: targetUserId, to: currentUserId }
            ]
        }).sort({ createdAt: 1 }) // Sắp xếp tin nhắn cũ nhất lên trước để hiển thị lịch sử từ trên xuống
          .populate('from', 'username fullName avatarUrl')
          .populate('to', 'username fullName avatarUrl');

        res.status(200).send({ success: true, data: messages });
    } catch (error) {
        res.status(400).send({ success: false, message: error.message });
    }
});

module.exports = router;
