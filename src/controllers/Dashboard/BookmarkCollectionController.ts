import { Request, Response } from 'express';
import db from '../../db';

export const BookmarkCollectionController = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({error: true, message: 'Unauthorized'});
    }

    const { collectionId, bookmark } = req.body as { collectionId: number; bookmark: boolean };

    if (typeof collectionId !== 'number' || typeof bookmark !== 'boolean') {
        return res.status(400).json({error: true, message: 'Invalid request data'});
    }

    try {
        await db.query('UPDATE collections SET bookmarked = $1 WHERE id = $2 AND user_id = $3', [bookmark, collectionId, req.user.id]);
        return res.status(200).json({error: false, message: 'Bookmark status updated successfully'});
    } catch (error) {
        console.error('Error updating bookmark status:', error);
        return res.status(500).json({error: true, message: 'Internal server error'});
    }
}