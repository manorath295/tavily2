/**
 * Google News RSS Feed Search
 * No API key required - uses public RSS feeds
 */

import Parser from "rss-parser";

export interface GoogleNewsResult {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
}

/**
 * Search Google News via RSS feeds
 * @param query - Search query
 * @param maxResults - Maximum number of results (default: 5)
 * @returns Array of news results
 */
export async function searchGoogleNews(
  query: string,
  maxResults: number = 5,
): Promise<GoogleNewsResult[]> {
  console.log("\n📰 [GOOGLE NEWS] Searching for:", query);

  try {
    const parser = new Parser({
      customFields: {
        item: ["source"],
      },
    });

    // Google News RSS search URL
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`;

    console.log("📡 Fetching RSS feed...");
    const feed = await parser.parseURL(rssUrl);

    console.log(`✅ Found ${feed.items.length} news articles`);

    const results = feed.items.slice(0, maxResults).map((item) => {
      const source = extractSource(item.title || "");
      return {
        title: cleanTitle(item.title || ""),
        url: item.link || "",
        source: source,
        publishedAt: item.pubDate || new Date().toISOString(),
        snippet: item.contentSnippet || item.content || "",
      };
    });

    console.log(`✅ Returning ${results.length} Google News results`);
    return results;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Google News RSS error:", errorMsg);
    // Return empty array on error (graceful degradation)
    return [];
  }
}

/**
 * Extract source name from Google News title
 * Google News titles format: "Article Title - Source Name"
 */
function extractSource(title: string): string {
  const match = title.match(/\s-\s([^-]+)$/);
  return match ? match[1].trim() : "Unknown";
}

/**
 * Remove source name from title
 */
function cleanTitle(title: string): string {
  const match = title.match(/^(.+?)\s-\s[^-]+$/);
  return match ? match[1].trim() : title;
}

/**
 * Check if Google News RSS is accessible
 */
export async function isGoogleNewsAvailable(): Promise<boolean> {
  try {
    const parser = new Parser();
    await parser.parseURL("https://news.google.com/rss?hl=en&gl=US&ceid=US:en");
    return true;
  } catch {
    return false;
  }
}
