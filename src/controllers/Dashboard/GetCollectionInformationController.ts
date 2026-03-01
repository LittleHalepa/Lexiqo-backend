import { Request, Response } from "express";
import db from "../../db";

const GetCollectionInfo = async (req: Request, res: Response) => {
  const { collectionUuid } = req.body;

  if (!collectionUuid || collectionUuid === "null" || collectionUuid === "undefined") {
    return res.status(400).json({ error: true, message: "Collection UUID is missing!" });
  }

  const user = req.user;

  try {
    const result = await db.query(
      `
      SELECT c.*, u.username
      FROM collections c
      JOIN users u ON c.user_id = u.id
      WHERE c.uuid = $1
      `,
      [collectionUuid]
    );

    const collection = result.rows[0];

    if (!collection) {
      return res.status(404).json({ error: true, message: "Collection not found!" });
    }

    if (user && collection.user_id === user.id) {
      return res.status(200).json({ data: collection });
    }

    if (!collection.is_public) {
      return res.status(403).json({ error: true, message: "You do not have permission to access this collection!" });
    }

    return res.status(200).json({ data: collection });
  } catch (error) {
    console.error("Error fetching collection info:", error);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }
};

export default GetCollectionInfo;