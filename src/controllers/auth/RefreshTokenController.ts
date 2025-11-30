import { Request, Response } from 'express';
import {
    TokenPayload,
    validateRefreshToken,
    generateTokens,
    revokeRefreshToken,
    saveRefreshToken
} from '../../utils/tokenUtills';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
}

const ACCESS_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 15 * 60 * 1000, // 15 minutes (typical access token lifespan)
    path: '/'
}

export const refreshToken = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token not found!' });
    }

    try {

        const tokenData = await validateRefreshToken(refreshToken);

        if (!tokenData) {
            res.clearCookie('refreshToken');
            return res.status(403).json({ message: 'Invalid or expired refresh token!' });
        }

        const tokenPayload: TokenPayload = {
            id: tokenData.id,
            username: tokenData.username,
            hashedEmail: tokenData.hashed_email,
            public_id: tokenData.public_id,
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateTokens(tokenPayload);

        await revokeRefreshToken(refreshToken);

        await saveRefreshToken(tokenData.id, newRefreshToken);

        res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
        res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);

        return res.status(200).json({
            message: 'Tokens refreshed successfully',
        });

    }catch (error: unknown) {
        console.error('Error refreshing token:', error);
        
        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');
        return res.status(500).json({ message: 'Internal server error' });
    }
}   