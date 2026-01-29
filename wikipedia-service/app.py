"""
Wikipedia Search Microservice
Provides Wikipedia search functionality via HTTP API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_community.retrievers import WikipediaRetriever
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Wikipedia retriever
retriever = WikipediaRetriever(
    lang="en",
    load_max_docs=3,  # Limit to 3 documents for speed
    load_all_available_meta=False
)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "wikipedia-search"}), 200

def optimize_wikipedia_query(query: str) -> str:
    """
    Optimize query for Wikipedia search by:
    1. Removing noise words (is, alive, dead, has, etc.)
    2. Extracting the main entity/person name
    3. Keeping only relevant keywords
    """
    # Words to remove (noise words that don't help Wikipedia search)
    noise_words = [
        'is', 'are', 'was', 'were', 'has', 'have', 'had',
        'alive', 'dead', 'true', 'false', 'really', 'actually',
        'the', 'a', 'an', 'that', 'this', 'these', 'those',
        '2026', '2025', '2024', '2023',  # Remove years
        'retires', 'retired', 'retirement',  # Keep base form only
    ]
    
    # Split query into words
    words = query.lower().split()
    
    # Remove noise words
    cleaned_words = [w for w in words if w not in noise_words]
    
    # Join back
    optimized = ' '.join(cleaned_words)
    
    logger.info(f"   Query optimization: '{query}' → '{optimized}'")
    
    return optimized if optimized else query  # Fallback to original if empty


@app.route('/search', methods=['POST'])
def search_wikipedia():
    """
    Search Wikipedia for a given query
    
    Request body:
    {
        "query": "search query",
        "max_results": 3  // optional, default 3
    }
    
    Response:
    {
        "results": [
            {
                "title": "Article Title",
                "summary": "Article summary...",
                "url": "https://en.wikipedia.org/wiki/..."
            }
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            logger.error("Missing 'query' in request body")
            return jsonify({"error": "Missing 'query' in request body"}), 400
        
        query = data['query']
        max_results = data.get('max_results', 3)
        
        logger.info(f"📚 [WIKIPEDIA] Original query: {query}")
        
        # Optimize query for Wikipedia
        optimized_query = optimize_wikipedia_query(query)
        logger.info(f"   Optimized query: {optimized_query}")
        logger.info(f"   Max results: {max_results}")
        
        # Search Wikipedia with optimized query
        logger.info("   Calling WikipediaRetriever.invoke()...")
        docs = retriever.invoke(optimized_query)
        logger.info(f"   ✅ Retrieved {len(docs)} documents from Wikipedia")
        
        # Format results
        results = []
        for idx, doc in enumerate(docs[:max_results], 1):
            logger.info(f"   Processing document {idx}...")
            
            # Extract title from metadata or content
            title = doc.metadata.get('title', 'Unknown')
            logger.info(f"     Title: {title}")
            
            # Get summary (first 500 characters)
            summary = doc.page_content[:500] if doc.page_content else ""
            logger.info(f"     Summary length: {len(summary)} chars")
            
            # Construct Wikipedia URL
            url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
            
            results.append({
                "title": title,
                "summary": summary,
                "url": url
            })
        
        logger.info(f"✅ [WIKIPEDIA] Returning {len(results)} results")
        
        return jsonify({
            "results": results,
            "count": len(results),
            "optimized_query": optimized_query  # Return optimized query for debugging
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [WIKIPEDIA] Error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Failed to search Wikipedia",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    logger.info("Starting Wikipedia Search Microservice on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
