import { env } from "../shared/env";
import { WebSearchResultSchema, WebSearchResultsSchema } from "./schemas";

export async function webSearch(q: string) {
  const query = (q ?? "").trim();
  if (!query) return [];
  return await searchTavilyUtil(query);
}

async function searchTavilyUtil(query: string) {
  console.log("\n🔍 [TAVILY API] Searching for:", query);

  if (!env.TAVILY_API_KEY) {
    console.error("❌ Tavily API Key is missing!");
    throw new Error("Tavily API Key Is Missing");
  }

  console.log("📡 Sending request to Tavily API...");
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 5,
      include_answers: false,
      include_images: false,
    }),
  });

  console.log("📥 Tavily response status:", response.status);

  if (!response.ok) {
    const text = await safeText(response);
    console.error("❌ Tavily API error:", response.status, text);
    throw new Error(`Tavily Error ${response.status}-- ${text}`);
  }

  const data = await response.json();
  console.log("✅ Tavily data received");

  const results = Array.isArray(data?.results) ? data.results : [];
  console.log(`📊 Tavily returned ${results.length} results`);

  const normalized = results.slice(0, 5).map((r: any) =>
    WebSearchResultSchema.parse({
      title: String(r?.title ?? "").trim() || "untitled",
      url: String(r?.url ?? "").trim(),
      snippet: String(r?.Content ?? "")
        .trim()
        .slice(0, 220),
    }),
  );

  console.log(
    "✅ Results normalized:",
    normalized.map((r) => r.title),
  );

  return WebSearchResultsSchema.parse(normalized);
}
async function safeText(res: Response) {
  try {
    return await res.json();
  } catch {
    return "<NOBody>";
  }
}
