
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

router.post('/create-collection', authenticateToken ,createNewCollectionController);
router.get('/get-collections', authenticateToken ,getCollectionsController);
router.post('/bookmark-collection',authenticateToken, BookmarkCollectionController);
router.post('/get-cards', authenticateToken, getCardsController);
router.get('/get-recent-collections', authenticateToken, GetRecentCollections);
router.post('/add-to-recent-collections', authenticateToken, AddToRecentCollections);
router.post('/get-collection-info', authenticateToken, GetCollectionInfo);

export default router;