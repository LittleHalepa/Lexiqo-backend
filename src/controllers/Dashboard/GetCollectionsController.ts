import { Request, Response } from 'express';
import db from '../../db';

export const getCollectionsController = async (req: Request, res: Response) => {

    if (!req.user) {
        return res.status(401).json({error: true, message: 'Unauthorized'});
    }

    try {
        const collections = await db.query('SELECT * FROM collections WHERE user_id = $1', [req.user.id]);

        if (collections.rows.length === 0) {
            return res.status(404).json({error: true, message: 'No collections found'});
        }

        return res.status(200).json({error: false, data: collections.rows});
    } catch (error) {
        console.error('Error fetching collections:', error);
        return res.status(500).json({error: true, message: 'Internal server error'});
    }

}