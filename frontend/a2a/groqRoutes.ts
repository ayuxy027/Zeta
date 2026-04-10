import { Router } from "express";
import * as groqController from "../controllers/groqController.js";
import { rateLimitMiddleware } from "../middleware/rateLimiter.js";

const router = Router();

// Chat
router.post("/chat", rateLimitMiddleware("groq_chat"), groqController.chat);

// Stream chat
router.post(
  "/chat/stream",
  rateLimitMiddleware("groq_chat"),
  groqController.streamChat,
);

// Generate document
router.post(
  "/draft/generate",
  rateLimitMiddleware("groq_draft"),
  groqController.generateDocument,
);

// Stream document generation
router.post(
  "/draft/stream",
  rateLimitMiddleware("groq_draft"),
  groqController.streamDocument,
);

export default router;
