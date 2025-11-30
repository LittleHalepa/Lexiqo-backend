import { Router } from "express";
import { getUserInfoController } from "../controllers/user/GetUserInformationController";
import { authenticateToken } from "../middleware/authMiddleware";
    
const router = Router();

router.get('/', authenticateToken , getUserInfoController);

export default router;