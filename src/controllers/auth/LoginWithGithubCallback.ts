import { Request, Response } from "express";
import { encryptEmail, hashEmail } from "../../utils/encryptionUtills";
import db from "../../db";
import { generateTokens, saveRefreshToken } from "../../utils/tokenUtills";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days - keep consistent
    path: '/'
}

const ACCESS_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 15 * 60 * 1000, // 15 minutes (typical access token lifespan)
    path: '/'
}

const GITHUB_CLIENT_ID = process.env.GITHUB_AUTH_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_AUTH_CLIENT_SECRET;

export const githubCallback = async (req: Request, res: Response) => {
    try {

    const code = req.query.code as string;

    if (!code) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=missing_code`);
    }

        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        if (!tokenResponse.ok) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=token_exchange_failed`);
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_access_token`);
        }

        const githubAccessToken = tokenData.access_token;

        const userResponse = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${githubAccessToken}` },
        });

        if (!userResponse.ok) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=failed_to_fetch_user_info`);
        }

        const user = await userResponse.json();

        const emailsResponse = await fetch("https://api.github.com/user/emails", {
            headers: { Authorization: `Bearer ${githubAccessToken}` },
        });

        if (!emailsResponse.ok) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=failed_to_fetch_emails`);
        }


        const emails = await emailsResponse.json();
        const primaryEmail = emails.find((e: any) => e.primary)?.email;

        if (!primaryEmail) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_primary_email`);
        }

        // Registration or login logic here

        const hashedEmail = hashEmail(primaryEmail);
        const existingUser = await db.query('SELECT * FROM users WHERE hashed_email = $1', [hashedEmail]);

        if (existingUser.rows.length === 0) {

            const { encrypted, iv, tag } = encryptEmail(primaryEmail);

            const newUser = await db.query(
                'INSERT INTO users (username, hashed_email, is_verified, public_id, method, profile_picture, email_encrypted, email_iv, email_tag) VALUES ($1, $2, $3, gen_random_uuid(), $4, $5, $6, $7, $8) RETURNING id, public_id, username, profile_picture',
                [user.login, hashedEmail, true, 'github', user.avatar_url, encrypted, iv, tag]
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

            res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
            res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);

            return res.redirect(`${process.env.FRONTEND_URL}/user/${createdUser.public_id}/dashboard/home`);

        }

        const oldUser = existingUser.rows[0];

        if (oldUser.method !== 'github') {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=use_different_login_method`);
        }

        const { accessToken, refreshToken } = generateTokens({
            id: oldUser.id,
            username: oldUser.username,
            hashedEmail: oldUser.hashed_email,
            profile_picture: oldUser.profile_picture,
            public_id: oldUser.public_id
        });

        await saveRefreshToken(oldUser.id, refreshToken);

        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);

        return res.redirect(`${process.env.FRONTEND_URL}/user/${oldUser.public_id}/dashboard/home`);

    } catch (error) {
        console.error('OAuth callback error:', error);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
}