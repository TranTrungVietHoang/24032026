const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    secure: false,
    auth: {
        user: "cefb202f1bd08b",
        pass: "296e5051b836b9",
    },
});

module.exports = {
    sendMail: async (to, url) => {
        const info = await transporter.sendMail({
            from: 'Admin@hahah.com',
            to: to,
            subject: "request resetpassword email",
            text: "click vao day de reset",
            html: "click vao <a href=" + url + ">day</a> de reset",
        });

        console.log("Message sent:", info.messageId);
    },
    sendPasswordMail: async (to, username, password) => {
        const info = await transporter.sendMail({
            from: 'Admin@hahah.com',
            to: to,
            subject: "Your New Account Credentials",
            text: `Welcome ${username}! Your password is: ${password}`,
            html: `<h1>Welcome ${username}!</h1><p>Your account has been created.</p><p><strong>Username:</strong> ${username}</p><p><strong>Password:</strong> ${password}</p><p>Please login and change your password immediately.</p>`,
        });

        console.log("Password email sent to:", to, "ID:", info.messageId);
    }
}