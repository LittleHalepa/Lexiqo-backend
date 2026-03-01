import { Request, Response } from "express";
import db from "../../db";

export const changeCollectionAccessController = async (req: Request, res: Response) => {

    const { collectionUuid, isPublic } = req.body;

    if (!collectionUuid || collectionUuid === "null" || collectionUuid === "undefined") {
        return res.status(400).json({ error: true, message: "Collection UUID is missing!" });
    }

    if (typeof isPublic !== "boolean" || isPublic === null || isPublic === undefined || isNaN(isPublic as any)) {
        return res.status(400).json({ error: true, message: "isPublic must be a boolean!" });
    }

    const user = req.user;

    if (!user) {
        return res.status(401).json({ error: true, message: "Unauthorized!" });
    }

    try {
        const result = await db.query(
            `
            UPDATE collections
            SET is_public = $1
            WHERE uuid = $2 AND user_id = $3
            RETURNING *
            `,
            [isPublic, collectionUuid, user.id]
        );
        const updatedCollection = result.rows[0];

        if (!updatedCollection) {
            return res.status(404).json({ error: true, message: "Collection not found or you do not have permission to change its access!" });
        }
        return res.status(200).json({ error: false, data: updatedCollection });
    } catch (error) {
        console.error("Error changing collection access:", error);
        return res.status(500).json({ error: true, message: "Internal server error" });
    }
}