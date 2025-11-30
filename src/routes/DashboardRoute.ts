
import { Router } from 'express';
import { createNewCollectionController } from '../controllers/Dashboard/CreateNewCollectionController';
import { authenticateToken } from '../middleware/authMiddleware';
import { getCollectionsController } from '../controllers/Dashboard/GetCollectionsController';
import { limiters } from '../middleware/bruteForceMiddleware';
import { BookmarkCollectionController } from '../controllers/Dashboard/BookmarkCollectionController';

const router = Router();

router.post('/create-collection', authenticateToken ,createNewCollectionController);
router.get('/get-collections', authenticateToken ,getCollectionsController);
router.post('/bookmark-collection',authenticateToken, BookmarkCollectionController);

export default router;