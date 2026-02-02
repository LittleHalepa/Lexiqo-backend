import { Request, Response } from "express";
import { generateCode } from "../../utils/sendMailUtils";
import redis from "../../Redis";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import db from "../../db";
import { hashEmail } from "../../utils/encryptionUtills";
import { isValidEmail } from "../../utils/validators";
import { hashCode } from "../../utils/encryptionUtills";

export const sendMailVerifyCode = async (req: Request, res: Response) => {
    const { email } = req.body;
    const code = generateCode();

    if (!email) {
        return res.status(400).json({ error: true, message: 'Email is required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: true, message: 'Please enter a valid email format!' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const hashedEmail = hashEmail(normalizedEmail);

    const hashedCode = hashCode(code);

    const existingUser = await db.query(
        'SELECT * FROM users WHERE hashed_email = $1',
        [hashedEmail]
    );

    if (existingUser.rows.length === 0) {
        return res.status(400).json({ error: true, message: 'Email not registered' });
    }

    if (existingUser.rows[0].is_verified) {
        return res.status(400).json({ error: true, message: 'Email already verified' });
    }

    await redis.set(`verifyEmail:${hashedEmail}`, hashedCode, 'EX', 300);

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // true для порту 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        },
        // Додай цей блок, щоб уникнути проблем з сертифікатами на деяких серверах
        tls: {
            rejectUnauthorized: false
        }
    });

    const templatePath = path.join(__dirname, '../../../templates/emailVerifyCodeTemplate.html');
    const emailTemplate = fs.readFileSync(templatePath, 'utf-8');
    const htmlContent = emailTemplate.replace('{{OTP_CODE}}', code);

    try {
        await transporter.sendMail({
            from: `"Lexiqo" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Email Verification Code',
            text: `Your verification code is: ${code}`,
            html: htmlContent
        });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: true, message: 'Failed to send verification code. Please try again later.' });
    }

    res.status(200).json({
        message: 'Verification code sent successfully'
    });
}