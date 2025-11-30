import { Request, Response } from "express";

export const getUserInfoController = async (req: Request, res: Response) => {

    if (!req.user) {
        return res.status(401).json({error: true, message: 'Invalid access token.'});
    }

    return res.status(200).json({
        user: {
            id: req.user.id,
            username: req.user.username,
            hashedEmail: req.user.hashedEmail,
            public_id: req.user.public_id,
            profile_picture: (req.user as any).profile_picture
        }
    });
}