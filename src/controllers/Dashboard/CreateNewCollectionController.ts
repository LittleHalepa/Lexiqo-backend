import { Request, Response } from 'express';
import db from '../../db';

interface Flashcard {
    term: string;
    definition: string;
}

export const createNewCollectionController = async (req: Request, res: Response) => {

    if (!req.user) {
        return res.status(401).json({error: true, message: 'Unauthorized'});
    }

    const {collectionData} = req.body as { collectionData: Flashcard[] };
    if (!collectionData) {
        return res.status(400).json({error: true, message: 'Collection not found'});
    }

    const validData = collectionData.filter(
        (item: Flashcard) => item.term && item.definition
    );

    if (validData.length === 0) {
        return res.status(400).json({ error: true, message: 'No valid flashcards provided' });
    }

    const card_count = validData.length;

    const { name, description, color } = req.body;
    if (!name) {
        res.status(400).json({error: true, message: 'Name and description are required'});
    }

    if (name.length > 80) {
        return res.status(400).json({error: true, message: 'Name too long! Max 80 characters'});
    }

    if (!card_count || card_count <= 0) {
        return res.status(400).json({error: true, message: 'Card count must be greater than zero'});
    }

    const existingCollection = await db.query('SELECT * FROM collections WHERE name = $1 AND user_id = $2', [name, req.user.id]);
    if (existingCollection.rows.length !== 0) {
        return res.status(400).json({error: true, message: 'Collection with that name exists!'});
    }

    let collectionInfo;

    if (!description) {
        collectionInfo = await db.query('INSERT INTO collections (user_id, name, card_count, color) VALUES ($1, $2, $3, $4) RETURNING *', [req.user.id, name, card_count, color]);
    } else {

        if (description.length > 500) {
            return res.status(400).json({error: true, message: 'Description too long! Max 500 characters'});
        }

        collectionInfo = await db.query('INSERT INTO collections (user_id, name, description, card_count, color) VALUES ($1, $2, $3, $4, $5) RETURNING *', [req.user.id, name, description, card_count, color]);
    }

    if (collectionInfo.rows.length === 0) {
        return res.status(500).json({error: true, message: 'Failed to create collection'});
    }

    const collectionId = collectionInfo.rows[0].id;

    try {
        for (const item of validData) {
            await db.query('INSERT INTO cards (collection_id, term, definition) VALUES ($1, $2, $3)', [collectionId, item.term, item.definition]);
        }

        return res.status(200).json({error: false, message: 'Collection created successfully'});
    } catch (error) {
        console.error('Error inserting flashcards:', error);
        return res.status(500).json({error: true, message: 'Failed to add flashcards to collection'});
    }

}