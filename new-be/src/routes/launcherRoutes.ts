import { Router } from "express";
import { launchMenu } from "../controllers/launcherController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.post("/:id/launch", launchMenu);

export default router;
