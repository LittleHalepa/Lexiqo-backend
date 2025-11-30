import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                username: string;
                hashedEmail: string;
                public_id: string;
                profile_picture?: string;
            };
        }
    }
} 

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {

    const token = req.cookies.accessToken;

    if (!token) {
        return res.status(401).json({error: true, message: 'Access denied. No token provided.' });
    }

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

        if (!decoded) {
            return res.status(401).json({error: true, message: 'Invalid token.'});
        }

        req.user = {
            id: decoded.id,
            username: decoded.username,
            hashedEmail: decoded.hashedEmail,
            public_id: decoded.public_id,
            profile_picture: decoded.profile_picture
        }

        next();
    }catch (err) {
        console.error('Token verification failed:', err);
        
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({error: true, message: 'Token expired.'});
        }else if (err instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({error: true, message: 'Invalid token.'});
        }else {
            return res.status(500).json({error: true, message: 'Token verification failed.'});
        }
        
    }

}