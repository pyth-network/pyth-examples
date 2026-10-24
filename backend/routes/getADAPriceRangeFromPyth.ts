import { Router } from "express";
import { getADAPriceRangeFromPyth } from "../controllers/controller";

const router = Router();
router.get("/", getADAPriceRangeFromPyth);

export default router;