import { Request, Response } from 'express';
import { verifyRecaptcha } from '../../utils/validators';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import redis from '../../Redis';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 1000, 
    path: '/'
}

export const verifyRecaptchaController = async ( req: Request, res: Response) => {
    const { recaptchaToken } = req.body;

    if (!recaptchaToken) {
        return res.json({
            error: true,
            message: 'reCAPTCHA token missing'
        });
    }

    try {

        const isValidCaptcha = await verifyRecaptcha(recaptchaToken);
        if (!isValidCaptcha) {
            return res.status(400).json({
                error: true,
                message: 'reCAPTCHA verification failed'
            });
        }

        const key = randomUUID();

        const payload = {
            jti: key,
            purpose: "recaptcha"
        }

        const JWTtoken = jwt.sign(payload, String(process.env.JWT_RECAPTCHA_SECRET), { expiresIn: '1m' });

        await redis.set(`recaptcha:${key}`, 'valid' , 'EX', 60);

        res.cookie('recaptchaToken', JWTtoken, COOKIE_OPTIONS);

        return res.status(200).json({
            error: false,
            message: 'Recaptcha verification successful.', 
        });

    } catch (error) {
        console.error("Error occurred during validation of the recaptcha token: " + error);
        res.status(500).json({error: true, message: 'Internal server error' });
    }
}