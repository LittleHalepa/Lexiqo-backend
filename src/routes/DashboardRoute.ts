
import { Router } from 'express';
import { createNewCollectionController } from '../controllers/Dashboard/CreateNewCollectionController';
import { authenticateToken } from '../middleware/authMiddleware';
import { getCollectionsController } from '../controllers/Dashboard/GetCollectionsController';
import { limiters } from '../middleware/bruteForceMiddleware';
import { BookmarkCollectionController } from '../controllers/Dashboard/BookmarkCollectionController';
import getCardsController from '../controllers/Dashboard/GetCardsController';
import { GetRecentCollections } from '../controllers/Dashboard/GetRecentCollections';
import { AddToRecentCollections } from '../controllers/Dashboard/AddToRecentColllections';
import GetCollectionInfo from '../controllers/Dashboard/GetCollectionInformationController';

const router = Router();

router.post('/create-collection', authenticateToken , limiters.createCollection , createNewCollectionController);
router.get('/get-collections', authenticateToken , limiters.getCollections , getCollectionsController);
router.post('/bookmark-collection',authenticateToken, limiters.bookmarkCollection ,BookmarkCollectionController);
router.post('/get-cards', authenticateToken, limiters.getCards , getCardsController);
router.get('/get-recent-collections', authenticateToken, limiters.getRecentCollections ,GetRecentCollections);
router.post('/add-to-recent-collections', authenticateToken, limiters.addToRecentCollections ,AddToRecentCollections);
router.post('/get-collection-info',authenticateToken, limiters.getCollectionsInfo, GetCollectionInfo);

export default router;