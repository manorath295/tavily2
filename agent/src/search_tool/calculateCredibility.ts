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

    // Generate summary
    const trueClaims = verifiedClaims.filter((c: any) =>
      c.verdict.includes("True"),
    ).length;
    const falseClaims = verifiedClaims.filter((c: any) =>
      c.verdict.includes("False"),
    ).length;

    let summary = `Analysis of ${verifiedClaims.length} claim(s): `;
    if (trueClaims > falseClaims) {
      summary += `${trueClaims} verified as true or mostly true. `;
    } else if (falseClaims > trueClaims) {
      summary += `${falseClaims} found to be false or mostly false. `;
    } else {
      summary += "mixed results with conflicting evidence. ";
    }
    summary += `Overall credibility score: ${credibilityScore}/100.`;

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
