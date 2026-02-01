import { Router } from "express";
import { getUserInfoController } from "../controllers/user/GetUserInformationController";
import { authenticateToken } from "../middleware/authMiddleware";
import { limiters } from "../middleware/bruteForceMiddleware";
    
const router = Router();

router.get('/', authenticateToken , limiters.getUserInfo , getUserInfoController);

export default router;