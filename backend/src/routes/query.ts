import express, { type Request, type Response } from "express";
import { answerQuestion } from "../services/query.service.js";

export function createQueryRouter() {
  const router = express.Router();

  router.post("/query", async (req: Request, res: Response) => {
    const { question } = req.body as { question?: string };

    if (!question?.trim()) {
      res.status(400).json({ error: "Missing 'question' in request body" });
      return;
    }

    try {
      const result = await answerQuestion(question);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query failed";
      console.error("[query] Error:", message);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
