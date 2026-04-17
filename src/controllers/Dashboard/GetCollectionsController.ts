import { Request, Response } from 'express';
import db from '../../db';

type SortOption = 'most_recent' | 'oldest_first' | 'most_cards' | 'least_cards';

export const getCollectionsController = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Unauthorized' });
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 24, 50);

  const lastId = req.query.lastId ? parseInt(req.query.lastId as string) : null;
  const lastCreatedAt = req.query.lastCreatedAt
    ? new Date(req.query.lastCreatedAt as string)
    : null;
  const lastCardCount = req.query.lastCardCount
    ? parseInt(req.query.lastCardCount as string)
    : null;

  if (lastCreatedAt && isNaN(lastCreatedAt.getTime())) {
    return res.status(400).json({ error: true, message: 'Invalid lastCreatedAt' });
  }

  const sort = (req.query.sort as SortOption) || 'most_recent';

  const sortConfig: Record<
    SortOption,
    {
      order: string;
      fields: string[];
      direction: 'ASC' | 'DESC';
    }
  > = {
    most_recent: {
      order: `created_at DESC, id DESC`,
      fields: ['created_at', 'id'],
      direction: 'DESC',
    },
    oldest_first: {
      order: `created_at ASC, id ASC`,
      fields: ['created_at', 'id'],
      direction: 'ASC',
    },
    most_cards: {
      order: `card_count DESC, id DESC`,
      fields: ['card_count', 'id'],
      direction: 'DESC',
    },
    least_cards: {
      order: `card_count ASC, id ASC`,
      fields: ['card_count', 'id'],
      direction: 'ASC',
    },
  };

  try {
    const config = sortConfig[sort];

    const params: any[] = [req.user.id];
    let paramIndex = 2;

    let query = `
      SELECT *
      FROM collections
      WHERE user_id = $1
    `;

    if (lastId !== null) {
      const operator = config.direction === 'DESC' ? '<' : '>';

      if (config.fields[0] === 'created_at') {
        if (!lastCreatedAt) {
          return res.status(400).json({ error: true, message: 'Missing lastCreatedAt' });
        }

        query += `
          AND (bookmarked, created_at, id)
          ${operator}
          ($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})
        `;

        params.push(true, lastCreatedAt, lastId);
        paramIndex += 3;
      }

      if (config.fields[0] === 'card_count') {
        if (lastCardCount === null) {
          return res.status(400).json({ error: true, message: 'Missing lastCardCount' });
        }

        query += `
          AND (bookmarked, card_count, id)
          ${operator}
          ($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})
        `;

        params.push(true, lastCardCount, lastId);
        paramIndex += 3;
      }
    }

    query += `
      ORDER BY bookmarked DESC, ${config.order}
      LIMIT $${paramIndex}
    `;

    params.push(limit + 1); 

    const result = await db.query(query, params);

    const hasMore = result.rows.length > limit;
    const collections = hasMore ? result.rows.slice(0, limit) : result.rows;

    return res.json({
      error: false,
      collections,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
};