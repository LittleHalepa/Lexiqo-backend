import { Request, Response } from "express"
import db from "../../db";

const GetCollectionInfo = async (req: Request, res: Response) => {

    if (!req.user) {
        return res.status(401).json({error: true, message: 'Unauthorized'});
    }

    const collectionId = req.body.collectionId;

    if (!collectionId) {
        return res.status(400).json({error: true, message: 'Collection id is missing!'});
    }

    try {
        const collection = await db.query('SELECT * FROM collections WHERE id = $1 AND user_id = $2', [collectionId, req.user.id]);

        if (collection.rows.length === 0) {
            return res.status(404).json({error: true, message: 'Collection not found!'});
        }

        return res.status(200).json({data: collection.rows[0]});
    } catch (error) {
        console.error('Error fetching collection information: ' + error);
        return res.status(500).json({error: true, message: 'Internal server error'});
    }

}

export default GetCollectionInfo;