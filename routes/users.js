var express = require("express");
var router = express.Router();
let { CreateUserValidator, validationResult } = require('../utils/validatorHandler')
let userModel = require("../schemas/users");
let userController = require('../controllers/users')
let { CheckLogin, CheckRole } = require('../utils/authHandler')
let { importUsersFromExcel } = require('../utils/importHandler');
const path = require('path');

router.post('/import', CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
  try {
    const filePath = path.join(__dirname, '../uploads/1774322498612-671548538.xlsx');
    const results = await importUsersFromExcel(filePath);
    res.send({
      message: "Import process started",
      results: results
    });
  } catch (err) {
    res.status(500).send({ message: "Import failed", error: err.message });
  }
});

router.get("/", CheckLogin, CheckRole("ADMIN", "MODERATOR"), async function (req, res, next) {
  let users = await userModel
    .find({ isDeleted: false })
    .populate({
      path: 'role',
      select: 'name'
    })
  res.send(users);
});

router.get("/admins", CheckLogin, async function (req, res, next) {
  try {
      let users = await userModel
        .find({ isDeleted: false })
        .populate({
          path: 'role',
          match: { name: 'ADMIN' }, // Chỉ lấy những user có role là ADMIN
          select: 'name'
        });
      
      // Mongoose populate với match sẽ gán role = null nếu không khớp 'ADMIN'
      // Ta chỉ lấy các user có role != null
      let adminUsers = users.filter(u => u.role !== null);
      res.send(adminUsers);
  } catch (err) {
      res.status(500).send({ message: err.message });
  }
});

// PUT /api/v1/users/profile - Cập nhật thông tin cá nhân của chính mình
router.put("/profile", CheckLogin, async function (req, res, next) {
  try {
    const userId = req.user._id;
    // Không cho phép đổi username và role qua đường này
    const { fullName, email, avatarUrl } = req.body;
    
    let updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { fullName, email, avatarUrl },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).send({ message: "Không tìm thấy người dùng" });
    res.send(updatedUser);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// PUT /api/v1/users/change-password - Đổi mật khẩu
router.put("/change-password", CheckLogin, async function (req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await userModel.findById(req.user._id);
    
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    // 1. Kiểm tra mật khẩu cũ
    const bcrypt = require('bcrypt');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không chính xác" });
    }

    // 2. Cập nhật mật khẩu mới (Mongoose hook sẽ tự băm password)
    user.password = newPassword;
    await user.save();

    res.send({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.get("/:id",CheckLogin,CheckRole("ADMIN"), async function (req, res, next) {
  try {
    let result = await userModel
      .find({ _id: req.params.id, isDeleted: false })
    if (result.length > 0) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/", CheckLogin, CheckRole('ADMIN'), CreateUserValidator, validationResult, async function (req, res, next) {
  try {
    let newItem = await userController.CreateAnUser(
      req.body.username, req.body.password, req.body.email, req.body.role
    )
    res.send(newItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.put("/:id", CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await
      userModel.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    let populated = await userModel
      .findById(updatedItem._id)
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.delete("/:id", CheckLogin, CheckRole('ADMIN'), async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});



module.exports = router;