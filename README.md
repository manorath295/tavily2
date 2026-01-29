# 🔍 Fake News Detector

AI-powered fake news detection system that analyzes news articles and claims to determine credibility using advanced fact-checking technology.

## ✨ Features

- **Multi-Source Verification**: Cross-references claims against multiple trusted sources
- **Credibility Scoring**: 0-100 score indicating overall truthfulness
- **Claim Extraction**: Automatically identifies verifiable statements
- **Evidence-Based Analysis**: Shows supporting and contradicting evidence
- **Modern UI**: Beautiful, responsive interface with dark mode support
- **Dual Input**: Analyze text content or URLs

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- API Keys:
  - Google Gemini API key
  - Tavily Search API key
  - Groq API key (optional)

### Installation

1. **Clone and install dependencies**

```bash
# Install backend dependencies
cd agent
npm install

# Install frontend dependencies
cd ../client
npm install
```

2. **Configure environment variables**

Backend (`.env` in `agent/` folder):

```env
PORT=5000
ALLOWED_ORIGIN=http://localhost:3000
Google_API_KEY=your_google_api_key
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
GEMINI_MODEL=gemini-2.5-flash
GROQ_MODEL=llama-3.1-8b-instant
SEARCH_PROVIDER=tavily
```

3. **Run the application**

```bash
# Terminal 1: Start backend
cd agent
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

4. **Open your browser**

Navigate to `http://localhost:3000`

## 🎯 How to Use

1. **Choose input method**: Select "Paste Text" or "Enter URL"
2. **Enter content**: Paste news article text or enter a news URL
3. **Analyze**: Click "Analyze for Fake News"
4. **Review results**:
   - **Credibility Score**: 0-100 rating
   - **Verdict**: True, Mostly True, Mixed, Mostly False, or False
   - **Claims**: Individual fact-checked statements
   - **Sources**: Verified sources used for analysis

## 🏗️ Architecture

### Backend (`/agent`)

- **Express.js** API server
- **LangChain** for AI orchestration
- **Tavily Search** for web research
- **Google Gemini** for claim extraction and verification
- **Zod** for schema validation

### Frontend (`/client`)

- **Next.js 16** with App Router
- **React 19** with hooks
- **Tailwind CSS 4** for styling
- **TypeScript** for type safety

## 📊 API Endpoints

### POST `/fact-check`

Analyze content for fake news.

**Request:**

```json
{
  "content": "News article text..."
}
```

or

```json
{
  "url": "https://example.com/article"
}
```

**Response:**

```json
{
  "credibilityScore": 75,
  "verdict": "Mostly True",
  "claims": [
    {
      "text": "Claim statement",
      "verdict": "True",
      "confidence": 85
    }
  ],
  "evidence": [
    {
      "source": "https://source.com",
      "title": "Article title",
      "snippet": "Relevant excerpt",
      "supports": true
    }
  ],
  "sources": ["https://source1.com", "https://source2.com"],
  "summary": "Analysis summary"
}
```

## 🎨 Screenshots

The interface features:

- Gradient hero section with glassmorphism effects
- Clean, modern card-based layout
- Color-coded credibility scores (green/yellow/red)
- Smooth animations and transitions
- Responsive mobile design

## 🔧 Tech Stack

- **AI/ML**: Google Gemini, LangChain
- **Search**: Tavily API
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: Next.js, React, Tailwind CSS
- **Validation**: Zod

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

**Built with ❤️ using AI-powered fact-checking technology**
