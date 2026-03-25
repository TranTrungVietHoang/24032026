const ExcelJS = require('exceljs');
const crypto = require('crypto');
const userController = require('../controllers/users');
const roleModel = require('../schemas/roles');
const { sendPasswordMail } = require('./mailHandler');

const generatePassword = (length = 16) => {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
};

const importUsersFromExcel = async (filePath) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    // Find the 'user' role
    let userRole = await roleModel.findOne({ name: 'user', isDeleted: false });
    if (!userRole) {
        // If it doesn't exist, create it (as a fallback)
        userRole = new roleModel({ name: 'user', description: 'Default user role' });
        await userRole.save();
    }

    const results = {
        success: [],
        errors: []
    };

    // Iterate through rows (starting from row 2 to skip headers)
    worksheet.eachRow(async (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const username = row.getCell(1).value;
        const email = row.getCell(2).value;

        if (!username || !email) return;

        const password = generatePassword(16);

        try {
            const newUser = await userController.CreateAnUser(
                username,
                password,
                email,
                userRole._id
            );

            // Send email
            try {
                await sendPasswordMail(email, username, password);
                results.success.push({ username, email, status: 'Created & Emailed' });
            } catch (mailErr) {
                results.success.push({ username, email, status: 'Created but Email Failed', error: mailErr.message });
            }

        } catch (err) {
            results.errors.push({ username, email, error: err.message });
        }
    });

    // Wait for all iterations to complete (eachRow is sync, but we are doing async inside)
    // Actually eachRow doesn't wait for the async callback. 
    // Let's use a more robust way.
    
    return results;
};

// Robust version using array of promises
const importUsersFromExcelRobust = async (filePath) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    
    let userRole = await roleModel.findOne({ name: /user/i, isDeleted: false });
    if (!userRole) {
        userRole = new roleModel({ name: 'user', description: 'Default user role' });
        await userRole.save();
    }

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            let emailValue = row.getCell(2).value;
            // Handle formula result
            if (emailValue && typeof emailValue === 'object' && emailValue.result) {
                emailValue = emailValue.result;
            }
            rows.push({
                username: row.getCell(1).value?.toString().trim(),
                email: emailValue?.toString().trim()
            });
        }
    });

    const results = {
        success: [],
        errors: []
    };

    for (const row of rows) {
        if (!row.username || !row.email) continue;

        const password = generatePassword(16);
        try {
            await userController.CreateAnUser(
                row.username,
                password,
                row.email,
                userRole._id
            );

            try {
                await sendPasswordMail(row.email, row.username, password);
                results.success.push({ username: row.username, email: row.email, status: 'Created & Emailed' });
            } catch (mailErr) {
                results.success.push({ username: row.username, email: row.email, status: 'Created but Email Failed', error: mailErr.message });
            }
        } catch (err) {
            results.errors.push({ username: row.username, email: row.email, error: err.message });
        }
    }

    return results;
};

module.exports = { importUsersFromExcel: importUsersFromExcelRobust };
