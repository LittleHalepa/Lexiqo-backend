import { Request, Response } from 'express';
import db from '../../db';

export const AddToRecentCollections = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const { collectionId } = req.body;

    if (typeof collectionId !== 'number') {
        return res.status(400).json({ error: true, message: 'Invalid collectionId' });
    }

    try {
        await db.query('BEGIN');

        // 1. перевірка, що колекція належить юзеру
        const collection = await db.query(
            `SELECT * FROM collections WHERE id = $1 AND user_id = $2`,
            [collectionId, req.user.id]
        );

        if (collection.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: true, message: 'Collection not found' });
        }
        
        const collectionInfo = collection.rows[0];

        // 2. UPSERT → робимо її найновішою
        await db.query(
            `
            INSERT INTO recent_collections (user_id, collection_id, name, card_count, created_at, last_opened)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (user_id, collection_id)
            DO UPDATE SET last_opened = NOW()
            `,
            [req.user.id, collectionId, collectionInfo.name, collectionInfo.card_count]
        );

        // 3. залишаємо тільки 5
        await db.query(
            `
            DELETE FROM recent_collections
            WHERE id IN (
                SELECT id FROM recent_collections
                WHERE user_id = $1
                ORDER BY last_opened DESC
                OFFSET 5
            )
            `,
            [req.user.id]
        );

        await db.query('COMMIT');

        return res.status(200).json({ error: false });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        return res.status(500).json({ error: true, message: 'Internal server error' });
    }
};
