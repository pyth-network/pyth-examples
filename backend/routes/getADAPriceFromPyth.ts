import { Router } from "express";
import { getADAPriceFromPyth } from "../controllers/controller";

const router = Router();
router.get("/", getADAPriceFromPyth);

export default router;