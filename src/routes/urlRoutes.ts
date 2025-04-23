import express from "express";
import { createShortUrl, getAllShortUrls } from "../controllers/urlController";

const router = express.Router();

router.post("/short-url", createShortUrl);
router.get("/short-url", getAllShortUrls);
// router.get("/short-url/:id", getShortUrlById);
// router.delete("/short-url/:id", deleteShortUrl);

export default router;
