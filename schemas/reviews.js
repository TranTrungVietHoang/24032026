let mongoose = require('mongoose');

let reviewSchema = mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'product',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        default: ''
    },
    images: {
        type: [String],
        default: []
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = new mongoose.model('review', reviewSchema);
