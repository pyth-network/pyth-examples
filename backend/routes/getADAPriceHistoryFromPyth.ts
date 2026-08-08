import { Router } from "express";
import { getADAPriceHistoryFromPyth } from "../controllers/controller";

const router = Router();
router.get("/", getADAPriceHistoryFromPyth);

export default router;