import wikipedia from "wikipedia";

export interface WikipediaResult {
  title: string;
  summary: string;
  url: string;
}

/**
 * Search Wikipedia for a given query and return top results
 * @param query - The search query
 * @param maxResults - Maximum number of results to return (default: 3)
 * @returns Array of Wikipedia results with title, summary, and URL
 */
export async function searchWikipedia(
  query: string,
  maxResults: number = 3,
): Promise<WikipediaResult[]> {
  console.log("\n📚 [WIKIPEDIA] Searching for:", query);

  try {
    // Search Wikipedia
    const searchResults = await wikipedia.search(query, { limit: maxResults });
    console.log(`✅ Wikipedia found ${searchResults.results.length} results`);

    const results: WikipediaResult[] = [];

    // Get summary for each result
    for (const result of searchResults.results.slice(0, maxResults)) {
      try {
        const page = await wikipedia.page(result.title);
        const summary = await page.summary();

        results.push({
          title: result.title,
          summary: summary.extract.slice(0, 500), // Limit to 500 chars
          url:
            page.fullurl ||
            `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
        });

        console.log(`  ✅ Retrieved: ${result.title}`);
      } catch (e) {
        console.log(`  ⚠️ Failed to get page for: ${result.title}`);
      }
    }

    console.log(`📊 Wikipedia returned ${results.length} complete results`);
    return results;
  } catch (error) {
    console.error("❌ Wikipedia search error:", error);
    return [];
  }
}
