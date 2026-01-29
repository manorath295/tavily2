/**
 * Wikipedia search via Python microservice
 */

export interface WikipediaResult {
  title: string;
  summary: string;
  url: string;
}

const WIKIPEDIA_SERVICE_URL =
  process.env.WIKIPEDIA_SERVICE_URL || "http://localhost:5001";

/**
 * Search Wikipedia using the Python microservice
 * @param query - Search query
 * @param maxResults - Maximum number of results (default: 3)
 * @returns Array of Wikipedia results
 */
export async function searchWikipediaPython(
  query: string,
  maxResults: number = 3,
): Promise<WikipediaResult[]> {
  console.log("\n📚 [WIKIPEDIA-PYTHON] Searching for:", query);

  try {
    const response = await fetch(`${WIKIPEDIA_SERVICE_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      throw new Error(`Wikipedia service returned ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Wikipedia-Python returned ${data.count} results`);

    return data.results || [];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Wikipedia-Python search error:", errorMsg);

    // Return empty array on error (graceful degradation)
    return [];
  }
}

/**
 * Check if Wikipedia service is available
 */
export async function isWikipediaServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${WIKIPEDIA_SERVICE_URL}/health`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}
