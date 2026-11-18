import express from "express";
import { getResortContent, updateResortContent } from "../controllers/contentController.js";
import { protect, adminOnly } from "../middleware/authMIddleware.js";

const router = express.Router();

router.get("/resort", getResortContent);
router.put("/resort", protect, adminOnly, updateResortContent);

export default router;
