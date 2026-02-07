import { RunnableLambda } from "@langchain/core/runnables";
import { FactCheckOutput } from "../utils/schemas";

const VERDICT_SCORES: Record<string, number> = {
  True: 100,
  "Mostly True": 75,
  Mixed: 50,
  "Mostly False": 25,
  False: 0,
  Unverifiable: 50,
};

export const calculateCredibilityStep = RunnableLambda.from(
  async (input: any): Promise<FactCheckOutput> => {
    console.log("\n📊 [CALCULATE CREDIBILITY] Computing final score...");

    const { verifiedClaims, allEvidence, originalContent } = input;

    if (!verifiedClaims || verifiedClaims.length === 0) {
      console.log("⚠️ No verified claims, returning default response");
      return {
        credibilityScore: 50,
        verdict: "Unverifiable",
        claims: [],
        evidence: [],
        sources: [],
        summary: "No verifiable claims found in the content.",
      };
    }

    console.log("📋 Verified claims:", verifiedClaims.length);

    // Calculate overall credibility score
    const totalScore = verifiedClaims.reduce((sum: number, claim: any) => {
      // Get base score - use !== undefined to allow 0 for False verdict
      const baseScore =
        VERDICT_SCORES[claim.verdict] !== undefined
          ? VERDICT_SCORES[claim.verdict]
          : 50;
      const weightedScore = baseScore * (claim.confidence / 100);
      console.log(
        `  - "${claim.claim.slice(0, 40)}...": ${claim.verdict} (${claim.confidence}%) → Base: ${baseScore}, Weighted: ${weightedScore.toFixed(1)}`,
      );
      return sum + weightedScore;
    }, 0);

    const credibilityScore = Math.round(totalScore / verifiedClaims.length);
    console.log(`✅ Final credibility score: ${credibilityScore}/100`);

    // Determine overall verdict
    let overallVerdict: FactCheckOutput["verdict"];
    if (credibilityScore >= 80) overallVerdict = "True";
    else if (credibilityScore >= 60) overallVerdict = "Mostly True";
    else if (credibilityScore >= 40) overallVerdict = "Mixed";
    else if (credibilityScore >= 20) overallVerdict = "Mostly False";
    else overallVerdict = "False";

    console.log(`🎯 Overall verdict: ${overallVerdict}`);

    // Format claims
    const claims = verifiedClaims.map((vc: any) => ({
      text: vc.claim,
      verdict: vc.verdict,
      confidence: vc.confidence,
    }));

    // Deduplicate evidence sources
    const uniqueEvidence = Array.from(
      new Map(allEvidence.map((e: any) => [e.source, e])).values(),
    ).slice(0, 10) as typeof allEvidence;

    const sources = [
      ...new Set(uniqueEvidence.map((e: any) => e.source)),
    ] as string[];

    console.log(`📚 Unique sources: ${sources.length}`);

    // Generate detailed summary with context
    let summary = "";

    if (verifiedClaims.length === 1) {
      // Single claim - use the LLM's explanation for context
      const claim = verifiedClaims[0];
      const claimText =
        claim.claim.slice(0, 60) + (claim.claim.length > 60 ? "..." : "");

      summary = `Claim: "${claimText}"\n\n`;
      summary += `Verdict: ${claim.verdict} (${claim.confidence}% confidence)\n\n`;

      // Add the LLM's detailed explanation
      if (claim.explanation) {
        summary += `Context: ${claim.explanation}\n\n`;
      }

      summary += `Credibility Score: ${credibilityScore}/100\n\n`;

      // Add source links for verification
      if (sources.length > 0) {
        summary += `Sources (click to verify):\n`;
        sources.slice(0, 5).forEach((source, i) => {
          // Extract domain name for display
          const domain = source.replace(/^https?:\/\//, "").split("/")[0];
          summary += `${i + 1}. ${domain}\n   ${source}\n`;
        });
      }
    } else {
      // Multiple claims - show breakdown
      const trueClaims = verifiedClaims.filter((c: any) =>
        c.verdict.includes("True"),
      ).length;
      const falseClaims = verifiedClaims.filter((c: any) =>
        c.verdict.includes("False"),
      ).length;

      summary = `Analysis of ${verifiedClaims.length} claim(s):\n\n`;

      verifiedClaims.forEach((claim: any, i: number) => {
        const claimText =
          claim.claim.slice(0, 50) + (claim.claim.length > 50 ? "..." : "");
        summary += `${i + 1}. "${claimText}"\n`;
        summary += `   Verdict: ${claim.verdict} (${claim.confidence}% confidence)\n`;
        if (claim.explanation) {
          summary += `   ${claim.explanation.slice(0, 150)}...\n`;
        }
        summary += `\n`;
      });

      summary += `Overall Credibility: ${credibilityScore}/100\n\n`;

      // Add source links
      if (sources.length > 0) {
        summary += `Sources:\n`;
        sources.slice(0, 5).forEach((source, i) => {
          const domain = source.replace(/^https?:\/\//, "").split("/")[0];
          summary += `${i + 1}. ${domain}\n   ${source}\n`;
        });
      }
    }

    console.log("📝 Summary:", summary);
    console.log("✅ Credibility calculation complete!\n");

    return {
      credibilityScore,
      verdict: overallVerdict,
      claims,
      evidence: uniqueEvidence,
      sources,
      summary,
    };
  },
);
