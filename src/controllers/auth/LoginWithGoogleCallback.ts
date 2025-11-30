import { Request, Response } from "express";
import { generateTokens, saveRefreshToken, validateGoogleAccessToken, validateIdToken } from "../../utils/tokenUtills";
import db from "../../db";
import { encryptEmail, hashEmail } from "../../utils/encryptionUtills";
import { isImage, isTrustedGoogleImage } from "../../utils/validators";

const GOOGLE_CLIENT_SECRET = String(process.env.GOOGLE_AUTH_CLIENT_SECRET);
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_AUTH_CLIENT_ID);
const REDIRECT_URI = "http://localhost:3000/api/auth/login-with-google/callback";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days - keep consistent
    path: '/'
}

const ACCESS_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 15 * 60 * 1000, // 15 minutes (typical access token lifespan)
    path: '/'
}

export const LoginWithGoogleCallback = async (req: Request, res: Response) => {
    try {
        const code = req.query.code as string;

        if (!code) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=missing_code`);
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code: code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=token_exchange_failed`);
        }

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=token_exchange_failed`);
        }

        const isTokenValid = await validateGoogleAccessToken(tokenData.access_token);
        if (!isTokenValid.valid) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_access_token`);
        }

        if (tokenData.id_token) {
            try {
                const isIdTokenValid = await validateIdToken(tokenData.id_token) as { valid: boolean; data?: any; error?: string };

                if (!isIdTokenValid.valid) {
                    return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_id_token`);
                }

            } catch (error) {
                return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_id_token`);
            }
        }

        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        if (!userInfoResponse.ok) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=failed_to_fetch_user_info`);
        }

        const googleUser = await userInfoResponse.json();

        if (googleUser.error) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=failed_to_fetch_user_info`);
        }

        if (!googleUser.email_verified) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=email_not_verified`);
        }

        if (!isImage(googleUser.picture) || !isTrustedGoogleImage(googleUser.picture)) {
            googleUser.picture = null; //TODO: set default image
        }

        // Registration or login logic here

        const hashedEmail = hashEmail(googleUser.email);
        const user = await db.query('SELECT * FROM users WHERE hashed_email = $1', [hashedEmail]);

        if (user.rows.length === 0) {

            const { encrypted, iv, tag } = encryptEmail(googleUser.email);

            const newUser = await db.query(
                'INSERT INTO users (username, hashed_email, is_verified, public_id, method, profile_picture, email_encrypted, email_iv, email_tag) VALUES ($1, $2, $3, gen_random_uuid(), $4, $5, $6, $7, $8) RETURNING id, public_id, username, profile_picture',
                [googleUser.name, hashedEmail, true, 'google', googleUser.picture, encrypted, iv, tag]
            );

            const createdUser = newUser.rows[0];

            const { accessToken, refreshToken } = generateTokens({
                id: createdUser.id,
                username: createdUser.username,
                hashedEmail: hashedEmail,
                profile_picture: createdUser.profile_picture,
                public_id: createdUser.public_id
            });

            await saveRefreshToken(createdUser.id, refreshToken);

            if (!createdUser) {
                return res.redirect(`${process.env.FRONTEND_URL}/login?error=user_creation_failed`);
            }

            res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
            res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);

            return res.redirect(`${process.env.FRONTEND_URL}/user/${createdUser.public_id}/dashboard`);

        }

        const existingUser = user.rows[0];

        if (existingUser.method !== 'google') {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=use_different_login_method`);
        }

        const { accessToken, refreshToken } = generateTokens({
            id: existingUser.id,
            username: existingUser.username,
            hashedEmail: existingUser.hashed_email,
            profile_picture: existingUser.profile_picture,
            public_id: existingUser.public_id
        });

        await saveRefreshToken(existingUser.id, refreshToken);

        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);

        return res.redirect(`${process.env.FRONTEND_URL}/user/${existingUser.public_id}/dashboard/home`);
        
    } catch (error) {
        console.error('OAuth callback error:', error);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
};