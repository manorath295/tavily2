import { RunnableLambda } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../shared/model";
import { FactCheckInput } from "../utils/schemas";
import { openUrl } from "../utils/openUrl";

const CLAIM_EXTRACTION_PROMPT = `You are a fact-checking assistant. Extract the PRIMARY factual claim from the given content.

CRITICAL RULES:
1. Extract ONLY the MAIN claim - do NOT break it into multiple sub-claims
2. Focus on the most important, verifiable statement
3. Ignore minor details, quotes, or supporting information
4. Return a SINGLE claim that captures the core assertion
5. If there are multiple unrelated claims, extract only the most significant one

Examples:
Input: "Arijit Singh, Bollywood's voice of love, retires from playback singing: 'It was a wonderful journey'"
Output: {"claims": ["Arijit Singh retires from playback singing"]}

Input: "Elon Musk buys Twitter for $44 billion and renames it to X"
Output: {"claims": ["Elon Musk bought Twitter for $44 billion"]}

Format your response as:
{
  "claims": ["single main claim here"]
}`;

export const extractClaimsStep = RunnableLambda.from(
  async (input: FactCheckInput) => {
    console.log("\n📝 [EXTRACT CLAIMS] Starting claim extraction...");
    console.log("Input:", input);

    let content = input.content || "";

    // If URL provided, fetch content
    if (input.url && !content) {
      console.log("🌐 Fetching content from URL:", input.url);
      try {
        const urlData = await openUrl(input.url);
        content = urlData.content;
        console.log("✅ Content fetched, length:", content.length);
      } catch (e) {
        console.error("❌ Failed to fetch URL:", e);
        throw new Error(`Failed to fetch URL: ${(e as Error).message}`);
      }
    }

    if (!content || content.trim().length < 10) {
      console.error("❌ No content available");
      throw new Error("No content available to fact-check");
    }

    console.log(
      "📄 Content to analyze (first 200 chars):",
      content.slice(0, 200),
    );
    console.log("🤖 Calling LLM for claim extraction...");

    const model = getChatModel({ temperature: 0.1 });

    const response = await model.invoke([
      new SystemMessage(CLAIM_EXTRACTION_PROMPT),
      new HumanMessage(
        `Extract factual claims from this content:\n\n${content.slice(0, 3000)}`,
      ),
    ]);

    console.log("✅ LLM response received");

    const rawOutput =
      typeof response.content === "string"
        ? response.content
        : (response.content?.map((c) => (c as any)?.text ?? "").join("\n") ??
          "");

    console.log("📤 Raw LLM output:", rawOutput);

    let claims: string[] = [];
    try {
      // Try to parse JSON response
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        claims = parsed.claims || [];
      }
    } catch (e) {
      console.log("⚠️ JSON parse failed, using fallback");
      // Fallback: treat each line as a claim
      claims = rawOutput
        .split("\n")
        .filter((line) => line.trim().length > 10)
        .slice(0, 5);
    }

    console.log("✅ Extracted claims:", claims);
    console.log("📊 Total claims found:", claims.length);

    return {
      originalContent: content,
      url: input.url,
      extractedClaims: claims.slice(0, 1), // Only take the FIRST (main) claim
    };
  },
);
