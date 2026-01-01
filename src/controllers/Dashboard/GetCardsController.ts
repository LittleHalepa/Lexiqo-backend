import { Request, Response } from 'express';
import db from '../../db';

const getCardsController = async (req: Request, res: Response) => {

    if (!req.user) {
        return res.status(401).json({error: true, message: 'Unauthorized'});
    }

    const collectionId = req.body.id;

    if (!collectionId) {
        return res.status(400).json({error: true, message: 'Collection ID is required'});
    }

    try {
        const collection = await db.query('SELECT * FROM collections WHERE id = $1 AND user_id = $2', [collectionId, req.user.id]);

        if (collection.rows.length === 0) {
            return res.status(404).json({error: true, message: 'Collection not found'});
        }

        const cards = await db.query('SELECT * FROM cards WHERE collection_id = $1', [collectionId]);

        if (cards.rows.length === 0) {
            return res.status(404).json({error: true, message: 'Cards not found'});
        }
        
        return res.status(200).json({error: false, cards: cards.rows});

    } catch (error) {
        console.error('Error fetching cards:', error);
        return res.status(500).json({error: true, message: 'Internal server error'});
    }
}

export default getCardsController;