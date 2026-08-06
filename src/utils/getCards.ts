import db from '../db';

const getCards = async (collectionUuid: string, user: any) => {

    try {
        const collectionResult = await db.query(
            `
            SELECT c.id, c.user_id, c.is_public
            FROM collections c
            WHERE c.uuid = $1
            `,
            [collectionUuid]
        );

        const collection = collectionResult.rows[0];

        if (!collection) {
        return {
            error: true,
            code: 404,
            message: "Collection not found",
        };
        }

        const isOwner = user && collection.user_id === user.id;

        if (!isOwner && !collection.is_public) {
        return {
                error: true,
                code: 403,
                message: "You do not have permission to access this collection",
            };
        }

        const cardsResult = await db.query(
            `
            SELECT *
            FROM cards
            WHERE collection_id = $1
            `,
        [collection.id]
        );

        return {
            error: false,
            code: 200,
            message: "Cards fetched successfully",
            cards: cardsResult.rows,
        };

    } catch (error) {
        console.error("Error fetching cards:", error);
        return {
            error: true,
            code: 500,
            message: "Internal server error",
        }
    }
}

export default getCards;