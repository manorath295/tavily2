import { RunnableLambda } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../shared/model";
import { webSearch } from "../utils/webSearch";

const VERIFICATION_PROMPT = `You are a fact-checking expert. Your ONLY job is to analyze the evidence provided from web searches and determine if the claim is supported by that evidence.

CRITICAL RULES:
1. Base your verdict ONLY on the evidence provided below
2. DO NOT use your own knowledge or training data
3. If multiple credible sources support the claim, it is likely TRUE
4. If multiple credible sources contradict the claim, it is likely FALSE
5. If sources are mixed or unclear, mark as MIXED or UNVERIFIABLE

Rate the claim as:
- "True": Fully supported by the provided evidence (3+ sources agree)
- "Mostly True": Largely supported by evidence with minor discrepancies
- "Mixed": Evidence is contradictory or unclear
- "Mostly False": Largely contradicted by evidence
- "False": Completely contradicted by the provided evidence (3+ sources disagree)
- "Unverifiable": Insufficient or unreliable evidence

Provide a confidence score (0-100) based on:
- Number of sources agreeing
- Quality/credibility of sources
- Consistency of information

Format your response as JSON:
{
  "verdict": "True|Mostly True|Mixed|Mostly False|False|Unverifiable",
  "confidence": 85,
  "explanation": "brief explanation based ONLY on the evidence provided"
}`;

interface ClaimVerificationResult {
  claim: string;
  verdict: string;
  confidence: number;
  evidence: Array<{
    source: string;
    title: string;
    snippet: string;
    supports: boolean;
  }>;
}

export const verifyClaimsStep = RunnableLambda.from(async (input: any) => {
  console.log("\n🔎 [VERIFY CLAIMS] Starting claim verification...");

  const { extractedClaims, originalContent, url } = input;

  console.log("📋 Claims to verify:", extractedClaims);

  if (!extractedClaims || extractedClaims.length === 0) {
    console.log("⚠️ No claims to verify");
    return {
      ...input,
      verifiedClaims: [],
      allEvidence: [],
    };
  }

  const model = getChatModel({ temperature: 0.2 });
  const verifiedClaims: ClaimVerificationResult[] = [];
  const allEvidence: any[] = [];

  for (const claim of extractedClaims) {
    console.log(`\n🔍 Verifying claim: "${claim}"`);

    try {
      // Enhance search query with context for better results
      // Add year/date context to avoid confusion with historical events
      const currentYear = new Date().getFullYear();
      const enhancedQuery = `${claim} ${currentYear}`;

      console.log(`🔍 Enhanced search query: "${enhancedQuery}"`);

      // Search for evidence from Tavily
      console.log("🌐 Calling Tavily Search API...");
      const searchResults = await webSearch(enhancedQuery);
      console.log(`✅ Tavily returned ${searchResults.length} results`);

      // Try to get Wikipedia results from Python service (optional)
      let wikiContext = "";
      try {
        const { searchWikipediaPython } =
          await import("../utils/wikipediaPython");
        const wikiResults = await searchWikipediaPython(claim, 2);

        if (wikiResults.length > 0) {
          console.log(
            `✅ Wikipedia-Python returned ${wikiResults.length} results`,
          );
          console.log("📚 Wikipedia results:");
          wikiResults.forEach((w, i) => {
            console.log(`  [W${i + 1}] ${w.title}`);
            console.log(`       ${w.summary.slice(0, 100)}...`);
            console.log(`       ${w.url}`);
          });

          wikiContext = "\n\n=== Wikipedia (Authoritative) ===\n";
          wikiContext += wikiResults
            .map(
              (w, i) =>
                `[W${i + 1}] ${w.title}\n${w.summary}\nSource: ${w.url}`,
            )
            .join("\n\n");
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.log(`⚠️ Wikipedia service error: ${errorMsg}`);
        console.log("   Continuing with Tavily only");
      }

      // Format evidence from Tavily
      let evidenceContext = searchResults
        .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`)
        .join("\n\n");

      // Add Wikipedia context if available
      evidenceContext += wikiContext;

      console.log(
        "📚 Evidence context prepared, length:",
        evidenceContext.length,
      );
      console.log("🤖 Asking LLM to verify claim...");

      // Ask LLM to verify claim
      const response = await model.invoke([
        new SystemMessage(VERIFICATION_PROMPT),
        new HumanMessage(
          `Claim to verify: "${claim}"\n\nEvidence from web search:\n${evidenceContext}\n\nBased ONLY on the evidence above (not your training data), what is your verdict?`,
        ),
      ]);

      console.log("✅ LLM verification response received");

      const rawOutput =
        typeof response.content === "string"
          ? response.content
          : (response.content?.map((c) => (c as any)?.text ?? "").join("\n") ??
            "");

      console.log("📤 Verification output:", rawOutput);

      let verdict = "Unverifiable";
      let confidence = 50;

      try {
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          verdict = parsed.verdict || "Unverifiable";
          confidence = parsed.confidence || 50;
        }
      } catch (e) {
        console.log("⚠️ JSON parse failed for verdict, using fallback");
        // Fallback parsing
        if (rawOutput.toLowerCase().includes("true")) verdict = "True";
        else if (rawOutput.toLowerCase().includes("false")) verdict = "False";
      }

      console.log(`✅ Verdict: ${verdict} (Confidence: ${confidence}%)`);

      // Collect evidence from Tavily
      const claimEvidence = searchResults.map((r) => ({
        source: r.url,
        title: r.title,
        snippet: r.snippet || "",
        supports: verdict.includes("True"),
      }));

      verifiedClaims.push({
        claim,
        verdict,
        confidence,
        evidence: claimEvidence,
      });

      allEvidence.push(...claimEvidence);
    } catch (e) {
      console.error(`❌ Error verifying claim: ${claim}`, e);
      verifiedClaims.push({
        claim,
        verdict: "Unverifiable",
        confidence: 0,
        evidence: [],
      });
    }
  }

  console.log("\n✅ All claims verified");
  console.log(
    "📊 Summary:",
    verifiedClaims.map((c) => `${c.claim.slice(0, 50)}... → ${c.verdict}`),
  );

  return {
    ...input,
    verifiedClaims,
    allEvidence,
  };
});
