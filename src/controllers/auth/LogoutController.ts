import { Request, Response } from 'express';
import { revokeRefreshToken } from '../../utils/tokenUtills';

export const logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    try {

        if (refreshToken) {
            await revokeRefreshToken(refreshToken);
        }

        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');
        
        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error: unknown) {
        console.error('Error during logout:', error);

        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');
        return res.status(500).json({ message: 'Internal server error' });
    }
}