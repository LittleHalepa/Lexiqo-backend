import { Request, Response } from "express";
import db from "../../db";

const getCardsController = async (req: Request, res: Response) => {
  const { collectionUuid } = req.body;

  if (!collectionUuid) {
    return res.status(400).json({
      error: true,
      message: "Collection UUID is required",
    });
  }

  const user = req.user;

  try {
    // 1️⃣ Отримуємо колекцію по public_uuid
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
      return res.status(404).json({
        error: true,
        message: "Collection not found",
      });
    }

    // 2️⃣ Перевірка доступу
    const isOwner = user && collection.user_id === user.id;

    if (!isOwner && !collection.is_public) {
      return res.status(403).json({
        error: true,
        message: "You do not have permission to access this collection",
      });
    }

    // 3️⃣ Отримуємо картки
    const cardsResult = await db.query(
      `
      SELECT *
      FROM cards
      WHERE collection_id = $1
      `,
      [collection.id]
    );

    return res.status(200).json({
      error: false,
      cards: cardsResult.rows,
    });

  } catch (error) {
    console.error("Error fetching cards:", error);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
    });
  }
};

export default getCardsController;