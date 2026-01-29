import { RunnableLambda } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../shared/model";
import { webSearch } from "../utils/webSearch";

const VERIFICATION_PROMPT = `You are a fact-checking expert. Analyze the evidence and determine if the claim is true or false.

Rate the claim as:
- "True": Fully supported by credible evidence
- "Mostly True": Largely accurate with minor issues
- "Mixed": Partially true and partially false
- "Mostly False": Largely inaccurate
- "False": Completely contradicted by evidence
- "Unverifiable": Insufficient evidence

Provide a confidence score (0-100) and brief explanation.

Format your response as JSON:
{
  "verdict": "True|Mostly True|Mixed|Mostly False|False|Unverifiable",
  "confidence": 85,
  "explanation": "brief explanation"
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
      // Search for evidence
      console.log("🌐 Calling Tavily Search API...");
      const searchResults = await webSearch(claim);
      console.log(`✅ Tavily returned ${searchResults.length} results`);

      const evidenceContext = searchResults
        .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`)
        .join("\n\n");

      console.log(
        "📚 Evidence context prepared, length:",
        evidenceContext.length,
      );
      console.log("🤖 Asking LLM to verify claim...");

      // Ask LLM to verify claim
      const response = await model.invoke([
        new SystemMessage(VERIFICATION_PROMPT),
        new HumanMessage(
          `Claim: "${claim}"\n\nEvidence:\n${evidenceContext}\n\nVerdict:`,
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
