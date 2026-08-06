import { Request, Response } from "express";
import getCards from "../../utils/getCards";

const getCardsController = async (req: Request, res: Response) => {
  const { collectionUuid } = req.body;

  if (!collectionUuid) {
    return res.status(400).json({
      error: true,
      message: "Collection UUID is required",
    });
  }

  const user = req.user;

  const result = await getCards(collectionUuid, user);

  return res.status(result.code).json(result);

};

export default getCardsController;