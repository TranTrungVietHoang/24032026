// Backend Web Bán Hàng - RESTful API
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let mongoose = require('mongoose');
let cors = require('cors');

var app = express();

// ==================== CORS ====================
// Cho phép FE (React Vite chạy port 5173) kết nối vào BE
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true // Cho phép gửi cookie (JWT httpOnly)
}));

// ==================== MIDDLEWARE ====================
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// Phục vụ ảnh upload từ thư mục uploads/
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== ROUTES (Restful API) ====================
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/categories', require('./routes/categories'));
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/inventories', require('./routes/inventories'));
app.use('/api/v1/roles', require('./routes/roles'));
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/carts', require('./routes/carts'));
app.use('/api/v1/payments', require('./routes/payments'));
app.use('/api/v1/upload', require('./routes/uploads'));
app.use('/api/v1/messages', require('./routes/messages'));
app.use('/api/v1/orders', require('./routes/orders'));
app.use('/api/v1/reviews', require('./routes/reviews'));
app.use('/api/v1/reservations', require('./routes/reservations'));

// ==================== DATABASE ====================
mongoose.connect('mongodb://localhost:27017/NNPTUD-S3');
mongoose.connection.on('connected', function () {
    console.log('✅ MongoDB connected');
});
mongoose.connection.on('disconnected', function () {
    console.log('❌ MongoDB disconnected');
});

// ==================== ERROR HANDLER (Restful JSON) ====================
// 404 Handler
app.use(function (req, res, next) {
    res.status(404).json({ message: 'Route not found' });
});

// Global error handler - trả về JSON thay vì render view
app.use(function (err, req, res, next) {
    const status = err.status || 500;
    res.status(status).json({
        message: err.message,
        error: req.app.get('env') === 'development' ? err : {}
    });
});

module.exports = app;
