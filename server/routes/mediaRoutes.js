import express from "express";
import { uploadMedia, getAllMedia, deleteMedia } from "../controllers/mediaController.js";
import { protect, adminOnly } from "../middleware/authMIddleware.js";
import { uploadResortImage } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", getAllMedia);
router.post("/upload", protect, adminOnly, uploadResortImage.single("image"), uploadMedia);
router.delete("/:id", protect, adminOnly, deleteMedia);

export default router;
