import { Router } from "express";
import { FactCheckInputSchema } from "../utils/schemas";
import { runFactCheck } from "../search_tool/factCheckChain";


export const factCheckRouter = Router();

factCheckRouter.post("/", async (req, res) => {
  console.log("\n🔍 [FACT-CHECK] New request received");
  console.log("📥 Request body:", JSON.stringify(req.body, null, 2));

  try {
    const input = FactCheckInputSchema.parse(req.body);
    console.log("✅ Input validated:", input);

    console.log("🚀 Starting fact-check chain...");
    const result = await runFactCheck(input);

    console.log("✅ Fact-check complete!");
    console.log("📊 Result:", JSON.stringify(result, null, 2));

    res.status(200).json(result);
  } catch (e) {
    console.error("❌ Error in fact-check:", e);
    const msg = (e as Error)?.message ?? "Unknown error occurred";
    return res.status(400).json({ error: msg });
  }
});
