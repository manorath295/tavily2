import { RunnableLambda } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../shared/model";
import { webSearch } from "../utils/webSearch";

const VERIFICATION_PROMPT = `You are a fact-checking expert. Analyze the evidence and provide a clear, user-friendly explanation.

CRITICAL RULES:
1. Base your verdict ONLY on the evidence provided
2. DO NOT use your own knowledge or training data
3. Write explanations in PLAIN LANGUAGE for regular users
4. DO NOT use cryptic references like [N1], [W2], etc.
5. Instead, describe what the sources say clearly

Verdicts:
- "True": Fully supported by evidence (3+ sources agree)
- "Mostly True": Largely supported with minor discrepancies
- "Mixed": Evidence is contradictory
- "Mostly False": Largely contradicted by evidence
- "False": Completely contradicted (3+ sources disagree)
- "Unverifiable": Insufficient evidence

EXPLANATION FORMAT (IMPORTANT):
Write a clear, structured explanation that users can understand:

1. Start with the main finding (what's actually true)
2. Clarify any nuances or partial truths
3. Mention what sources say (describe, don't just cite numbers)
4. Keep it concise (2-3 sentences max)

GOOD EXAMPLE:
"The claim is partially misleading. While Virat Kohli did retire from Test cricket in January 2026, he continues to play ODI and T20 formats. Multiple news sources confirm he is still an active international cricketer, with recent articles discussing his ongoing participation in limited-overs cricket."

BAD EXAMPLE (DON'T DO THIS):
"Sources [N1], [N4] discuss his continued play. Wikipedia [W1] and [W2] refer to him as active. Some sources [1], [N2] mention Test retirement."

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
  explanation?: string; // Optional: LLM's detailed explanation
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
        console.log("   Continuing without Wikipedia");
      }

      // Try to get Google News results (optional)
      let newsContext = "";
      try {
        const { searchGoogleNews } = await import("../utils/googleNews");
        const newsResults = await searchGoogleNews(claim, 5);

        if (newsResults.length > 0) {
          console.log(`✅ Google News returned ${newsResults.length} results`);
          console.log("📰 News results:");
          newsResults.forEach((n, i) => {
            console.log(`  [N${i + 1}] ${n.title}`);
            console.log(`       Source: ${n.source}`);
            console.log(`       Published: ${n.publishedAt}`);
          });

          newsContext = "\n\n=== News (Google News) ===\n";
          newsContext += newsResults
            .map(
              (n, i) =>
                `[N${i + 1}] ${n.title}\nSource: ${n.source} (${n.publishedAt})\nURL: ${n.url}`,
            )
            .join("\n\n");
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.log(`⚠️ Google News error: ${errorMsg}`);
        console.log("   Continuing without Google News");
      }

      // Format evidence from all sources
      let evidenceContext = "=== Web Search (Tavily) ===\n";
      evidenceContext += searchResults
        .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`)
        .join("\n\n");

      // Add News context if available
      evidenceContext += newsContext;

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
      let explanation = "";

      try {
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          verdict = parsed.verdict || "Unverifiable";
          confidence = parsed.confidence || 50;
          explanation = parsed.explanation || "";
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
        explanation, // Add explanation for context
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
