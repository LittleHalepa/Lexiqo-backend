import { Request, Response } from "express";
import { isValidEmail } from "../../utils/validators";
import { hashEmail, hashCode } from "../../utils/encryptionUtills";
import redis from "../../Redis";
import db from "../../db";
import { TokenPayload, generateTokens, saveRefreshToken } from "../../utils/tokenUtills";
import crypto from "crypto";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 днів
    path: '/'
};

const ACCESS_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 15 * 60 * 1000, // 15 хв
    path: '/'
};

export const verifyEmailCode = async (req: Request, res: Response) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: true, message: 'Email and code are required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: true, message: 'Please enter a valid email format!' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const hashedEmail = hashEmail(normalizedEmail);
    const hashedCode = hashCode(String(code));

    const storedHashedCode = await redis.get(`verifyEmail:${hashedEmail}`);

    if (!storedHashedCode) {
        return res.status(400).json({ error: true, message: 'Verification code expired or not found' });
    }

    const isCodeValid = crypto.timingSafeEqual(Buffer.from(storedHashedCode), Buffer.from(hashedCode));

    if (!isCodeValid) {
        return res.status(400).json({ error: true, message: 'Invalid verification code' });
    }

    const result = await db.query(
        'UPDATE users SET is_verified = TRUE WHERE hashed_email = $1 RETURNING *',
        [hashedEmail]
    );

    if (result.rows.length === 0) {
        return res.status(400).json({ error: true, message: 'Email not registered' });
    }

    const user = result.rows[0];
    await redis.del(`verifyEmail:${hashedEmail}`);

    const payload: TokenPayload = {
        id: user.id,
        username: user.username,
        hashedEmail: user.hashed_email,
        public_id: user.public_id,
    };

    const { accessToken, refreshToken } = generateTokens(payload);
    await saveRefreshToken(user.id, refreshToken);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);

    return res.status(200).json({ error: false, message: 'Email verified successfully' });
}