const fs = require('fs');

const collection = {
	"info": {
		"name": "Toàn Tập 14 Modules - NNPTUD E-Commerce Đồ Án",
		"description": "Kịch bản test TOÀN DIỆN 100% API của hệ thống BE.",
		"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
	},
	"variable": [
		{ "key": "baseUrl", "value": "http://localhost:3000/api/v1" },
		{ "key": "TOKEN", "value": "" },
		{ "key": "PRODUCT_ID", "value": "" },
		{ "key": "ORDER_ID", "value": "" },
		{ "key": "USER_ID", "value": "" },
        { "key": "CATEGORY_ID", "value": "" }
	],
	"item": []
};

// Hàm tiện ích tạo thư mục
function createFolder(name, items) {
    return { name: name, item: items };
}

// Hàm tiện ích phân giải script auto map token
const autoTokenScript = [
    "var data = pm.response.json();",
    "if(data.success && data.token) {",
    "    pm.collectionVariables.set('TOKEN', data.token);",
    "}"
];

// Hàm tạo Request
function createRequest(method, path, name, rawBody = null, auth = true, testScript = null) {
    let req = {
        name: name,
        request: {
            method: method,
            url: {
                raw: `{{baseUrl}}/${path}`,
                host: ["{{baseUrl}}"],
                path: path.split('/')
            }
        }
    };
    if (auth) {
        req.request.auth = {
            type: "bearer",
            bearer: [{ key: "token", value: "{{TOKEN}}", type: "string" }]
        };
    }
    if (rawBody) {
        req.request.body = { mode: "raw", raw: typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody, null, 4), options: { raw: { language: "json" } } };
    }
    if (testScript) {
        req.event = [{ listen: "test", script: { type: "text/javascript", exec: testScript } }];
    }
    return req;
}

// 1. AUTH
collection.item.push(createFolder("01. Auth (Đăng nhập/Đăng ký)", [
    createRequest("POST", "auth/register", "1. Đăng ký", { "username": "admin123", "password": "123", "email": "a@gmail.com" }, false),
    createRequest("POST", "auth/login", "2. Đăng nhập (Auto Save Token)", { "username": "admin123", "password": "123" }, false, autoTokenScript)
]));

// 2. USERS & ROLES
collection.item.push(createFolder("02. Users & Roles (Quyền Admin)", [
    createRequest("GET", "roles", "1. Xem toàn bộ Roles"),
    createRequest("POST", "roles", "2. Tạo Role Mới (Admin)", { "name": "MANAGER", "description": "Quản lý" }),
    createRequest("GET", "users", "3. Lấy Danh sách User"),
    createRequest("PUT", "users/{{USER_ID}}", "4. Trạng thái hoạt động User", { "isActive": false })
]));

// 3. CATEGORIES
collection.item.push(createFolder("03. Categories (Danh mục)", [
    createRequest("GET", "categories", "1. Danh sách Danh mục", null, false),
    createRequest("POST", "categories", "2. Tạo Danh Mục", {"name": "Laptop", "image": "laptop.png"}, true, [
        "var data = pm.response.json(); pm.collectionVariables.set('CATEGORY_ID', data._id);"
    ]),
    createRequest("PUT", "categories/{{CATEGORY_ID}}", "3. Sửa danh mục", {"name": "Laptop Gaming"}),
    createRequest("DELETE", "categories/{{CATEGORY_ID}}", "4. Xóa danh mục")
]));

// 4. SUPPLIERS
collection.item.push(createFolder("04. Suppliers (Nhà Cung Cấp)", [
    createRequest("GET", "suppliers", "1. Danh sách NCC"),
    createRequest("POST", "suppliers", "2. Thêm NCC Mới", {"name": "Apple VN", "phone": "098888", "address": "Q1, HCM"}),
]));

// 5. PRODUCTS & INVENTORIES
collection.item.push(createFolder("05. Products & Kho hàng", [
    createRequest("GET", "products", "1. Lấy tất cả Sản phẩm", null, false),
    createRequest("POST", "products", "2. Tạo SP Mới (+ Tự tạo kho 0đ)", { "title": "Macbook M3", "price": 4000, "category": "{{CATEGORY_ID}}" }, true, [
        "var data = pm.response.json(); pm.collectionVariables.set('PRODUCT_ID', data.product ? data.product._id : data._id);" // Xử lý trả về inventory object
    ]),
    createRequest("GET", "inventories", "3. Xem Tồn kho hiện tại"),
    createRequest("GET", "inventories/low-stock", "4. Chuông Cảnh báo rỗng kho")
]));

// 6. VOUCHERS
collection.item.push(createFolder("06. Vouchers (Khuyến mãi)", [
    createRequest("GET", "vouchers", "1. Lấy danh sách Voucher Public", null, false),
    createRequest("GET", "vouchers/admin", "2. Danh sách Voucher Admin", null, true),
    createRequest("POST", "vouchers", "3. Tạo Voucher Mới", {"code": "GIAM50", "discountType": "fixed", "discountValue": 50000, "endDate": "2030-01-01"}),
    createRequest("GET", "vouchers/check/GIAM50?amount=500000", "4. Check độ hợp lệ lúc Thanh toán")
]));

// 7. Carts & Orders (Quy trình mua hàng)
collection.item.push(createFolder("07. Carts & Orders (Mua Hàng)", [
    createRequest("POST", "carts", "1. Nhét SP vào Giỏ", {"product": "{{PRODUCT_ID}}", "quantity": 1}),
    createRequest("GET", "carts", "2. Xem giỏ hàng"),
    createRequest("POST", "orders", "3. CHỐT ĐƠN HÀNG (Sẽ báo lỗi nếu kho=0)", {"voucherCode": "GIAM50", "items": [{"product": "{{PRODUCT_ID}}", "quantity": 1, "price": 4000, "subtotal": 4000}], "shippingAddress": {"fullName": "Trần A", "phone": "090", "address": "HCM", "city": "HCM"}}, true, [
        "var data = pm.response.json(); if(data._id) pm.collectionVariables.set('ORDER_ID', data._id);"
    ]),
    createRequest("GET", "orders", "4. Xem Lịch sử đặt hàng"),
    createRequest("PUT", "orders/{{ORDER_ID}}", "5. HỦY ĐƠN (Quyền Admin) -> Tự động trả kho", {"status": "cancelled"})
]));

// 8. PAYMENT & RESERVATION
collection.item.push(createFolder("08. Payment & Reservation", [
    createRequest("POST", "reservations", "1. Đặt cọc giữ hàng", {"product": "{{PRODUCT_ID}}", "quantity": 2, "depositAmount": 500, "expectedBuyDate": "2029-01-01"}),
    createRequest("POST", "payments", "2. Mô phỏng ZaloPay IPN lưu biên lai", {"order": "{{ORDER_ID}}", "amount": 4000, "paymentMethod": "ZaloPay", "transactionId": "ZLP_1234"})
]));

// 9. REVIEWS & MESSAGES & NOTIFICATIONS (Tương tác User)
collection.item.push(createFolder("09. Tương tác mảng xã hội", [
    createRequest("POST", "reviews", "1. Viết Đánh Giá SP", {"product": "{{PRODUCT_ID}}", "rating": 5, "comment": "Hàng ngon quá"}),
    createRequest("POST", "messages", "2. Nhắn riêng cho Admin", {"to": "{{USER_ID}}", "messageContent": {"type": "text", "text": "Shop ơi hỗ trợ"}}),
    createRequest("GET", "notifications", "3. Đọc Thông báo của tôi"),
    createRequest("PUT", "notifications/read-all", "4. Đánh dấu đã đọc tất cả Noti")
]));

// 10. UPLOADS
collection.item.push(createFolder("10. Upload Module", [
    {
        name: "1. Upload File Excel lên Import",
        request: {
            method: "POST",
            auth: { type: "bearer", bearer: [{ key: "token", value: "{{TOKEN}}", type: "string" }] },
            url: { raw: "{{baseUrl}}/uploads/excel", host: ["{{baseUrl}}"], path: ["uploads", "excel"] },
            body: { mode: "formdata", formdata: [{ key: "file", type: "file", src: "" }] }
        }
    }
]));

fs.writeFileSync('Postman_Full_14_Modules.json', JSON.stringify(collection, null, 4));
console.log('Tạo xong file JSON Postman Full!');
