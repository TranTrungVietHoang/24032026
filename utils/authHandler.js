require('dotenv').config();
let userController = require('../controllers/users')
let jwt = require('jsonwebtoken')

module.exports = {
    CheckLogin: async function (req, res, next) {
        let key = req.headers.authorization;
        let token = "";

        if (!key) {
            if (req.cookies.LOGIN_NNPTUD_S3) {
                token = req.cookies.LOGIN_NNPTUD_S3;
            } else {
                return res.status(401).json({ message: "Bạn chưa đăng nhập" });
            }
        } else {
            // Cắt chữ 'Bearer ' nếu Postman tự động lắp vào
            token = key.startsWith('Bearer ') ? key.slice(7, key.length) : key;
        }

        try {
            let result = jwt.verify(token, process.env.JWT_SECRET || 'secretKey')
            if (result.exp * 1000 < Date.now()) {
                res.status(401).send("Token đã hết hạn")
                return;
            }
            let user = await userController.GetUserById(result.id);
            if (!user) {
                res.status(401).send("Không tìm thấy người dùng")
                return;
            }
            req.user = user;
            next();
        } catch (error) {
            res.status(401).send("Token không hợp lệ")
            return;
        }
    },

    CheckRole: function (...requiredRoles) {
        return function (req, res, next) {
            let user = req.user;
            let currentRole = user.role ? user.role.name : null;
            if (requiredRoles.includes(currentRole)) {
                next()
            } else {
                res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này" })
            }
        }
    }
}