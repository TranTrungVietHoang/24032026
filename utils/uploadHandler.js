require('dotenv').config();
let multer = require("multer");
let path = require('path')
let { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary API từ file .env
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

// 1. Storage cho Ảnh (Lưu thẳng lên Cloudinary)
const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'web_ban_hang_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Các đuôi ảnh được phép tải lên
    }
});

// 2. Storage cho Excel (Lưu cục bộ vào thư mục uploads/ trên Server)
let diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname);
        let fileName = Date.now() + '-' + Math.round(Math.random() * 1000_000_000) + ext;
        cb(null, fileName)
    }
});

let filterExcel = function (req, file, cb) {
    if (file.mimetype.includes('spreadsheetml')) { // Chặn đuôi file lạ, chỉ nhận excel (xlsx)
        cb(null, true)
    } else {
        cb(new Error("Định dạng file không đúng, chỉ nhận Excel!"))
    }
}

module.exports = {
    // Để nguyên tên module cũ để các file Routes gọi không bị lỗi
    uploadImage: multer({
        storage: cloudinaryStorage,
        limits: 5 * 1024 * 1024 // Giới hạn 5MB
    }),
    uploadExcel: multer({
        storage: diskStorage,
        limits: 10 * 1024 * 1024, // Giới hạn 10MB cho file Excel
        fileFilter: filterExcel
    })
}
