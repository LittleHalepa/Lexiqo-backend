import { Request, Response } from 'express';
import db from '../../db';

export const GetRecentCollections = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    try {
        const recentCollections = await db.query(`
            SELECT * FROM recent_collections
            WHERE user_id = $1
            ORDER BY last_opened DESC
            LIMIT 5
        `, [req.user.id]);

        return res.status(200).json({ error: false, data: recentCollections.rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: true, message: 'Internal server error' });
    }
}