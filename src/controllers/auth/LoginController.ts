import { Request, Response } from 'express';
import db from '../../db';
import bcrypt from 'bcrypt';
import { generateTokens, saveRefreshToken } from '../../utils/tokenUtills';
import { hashEmail } from '../../utils/encryptionUtills';
import { verifyRecaptcha } from '../../utils/validators';
import { sendMailVerifyCode } from '../auth/SendEmailVerifyCodeController';


import { CookieOptions } from 'express';

const COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
}

const ACCESS_COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/'
}


export const login = async (req: Request, res: Response) => {
    const { email, password, recaptchaToken } = req.body;

    if (!email || !password) {
        return res.status(400).json({error: true, message: 'Email and password are required.' });
    }

    if (!recaptchaToken) {
        return res.json({
            error: true,
            message: 'reCAPTCHA token missing'
        });
    }

    const isValidCaptcha = await verifyRecaptcha(recaptchaToken);
    if (!isValidCaptcha) {
        return res.json({
            error: true,
            message: 'reCAPTCHA verification failed'
        });
    }

    try {
        const hashed_email = hashEmail(email);
        const user = await db.query('SELECT * FROM users WHERE hashed_email = $1', [hashed_email]);

        if (user.rows.length === 0) {
            return res.status(401).json({error: true, message: 'Invalid email or password.' });
        }

        if (user.rows[0].method !== 'email/password') {
            return res.status(400).json({ error: true, message: 'Please log in using different method.'});
        }

        const isValidPassword = await bcrypt.compare(password, user.rows[0].password);

        if (!isValidPassword) {
            return res.status(401).json({error: true, message: 'Invalid email or password.' });
        }

        if (!user.rows[0].is_verified) {
            try {
                await sendMailVerifyCode({ body: { email } } as Request, {
                    status: () => ({ json: (data: any) => data }) 
                } as unknown as Response);

                return res.status(200).json({
                    error: false,
                    message: 'Account not verified. Verification code sent to email.',
                    user: {
                        id: user.rows[0].id,
                        username: user.rows[0].username,
                        email: email, 
                        public_id: user.rows[0].public_id,
                        profile_picture: user.rows[0].profile_picture
                    }
                });
            } catch (err) {
                console.error('Failed to send verification code:', err);
                return res.status(500).json({ error: true, message: 'Failed to send verification code. Please try again later.' });
            }
        }

        const tokenPayload = {
            id: user.rows[0].id,
            username: user.rows[0].username,
            hashedEmail: user.rows[0].hashed_email,
            public_id: user.rows[0].public_id,
            profile_picture: user.rows[0].profile_picture
        }

        const { accessToken, refreshToken } = generateTokens(tokenPayload);

        await saveRefreshToken(user.rows[0].id, refreshToken);

        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);

        return res.status(200).json({
            error: false,
            message: 'Login successful',
            user: {
                id: user.rows[0].id,
                username: user.rows[0].username,
                hashedEmail: user.rows[0].hashed_email, 
                public_id: user.rows[0].public_id,
                profile_picture: user.rows[0].profile_picture
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({error: true, message: 'Internal server error' });
    }
}