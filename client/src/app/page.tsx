'use client'

import { useState } from 'react'

interface FactCheckResult {
  credibilityScore: number
  verdict: string
  claims: Array<{
    text: string
    verdict: string
    confidence: number
  }>
  evidence: Array<{
    source: string
    title: string
    snippet: string
    supports: boolean
  }>
  sources: string[]
  summary: string
}

export default function Home() {
  const [inputType, setInputType] = useState<'text' | 'url'>('text')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FactCheckResult | null>(null)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setError('')
    setResult(null)
    setLoading(true)

    try {
      const payload = inputType === 'text' ? { content } : { url }
      
      const response = await fetch('http://localhost:5000/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze content')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'score-high'
    if (score >= 40) return 'score-medium'
    return 'score-low'
  }

  const getVerdictColor = (verdict: string) => {
    if (verdict === 'True' || verdict === 'Mostly True') return 'bg-green-500'
    if (verdict === 'Mixed') return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="gradient-hero text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center animate-fadeIn">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Fake News Detector
          </h1>
          <p className="text-xl md:text-2xl opacity-90 mb-8">
            AI-powered fact-checking to verify news and detect misinformation
          </p>
          <div className="flex gap-4 justify-center text-sm">
            <div className="glass px-4 py-2 rounded-full">
              ✓ Multi-source verification
            </div>
            <div className="glass px-4 py-2 rounded-full">
              ✓ Credibility scoring
            </div>
            <div className="glass px-4 py-2 rounded-full">
              ✓ Instant analysis
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Input Section */}
        <div className="bg-card rounded-2xl shadow-lg p-8 mb-8 animate-fadeIn">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setInputType('text')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                inputType === 'text'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Paste Text
            </button>
            <button
              onClick={() => setInputType('url')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                inputType === 'url'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Enter URL
            </button>
          </div>

          {inputType === 'text' ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the news article or claim you want to fact-check..."
              className="w-full h-48 p-4 border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          ) : (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/news-article"
              className="w-full p-4 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || (inputType === 'text' ? !content : !url)}
            className="w-full mt-6 py-4 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
          >
            {loading ? 'Analyzing...' : 'Analyze for Fake News'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-fadeIn">
            {/* Credibility Score */}
            <div className="bg-card rounded-2xl shadow-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Credibility Score</h2>
              <div className={`text-7xl font-bold mb-4 ${getScoreColor(result.credibilityScore)}`}>
                {result.credibilityScore}
                <span className="text-3xl">/100</span>
              </div>
              <div className={`inline-block px-6 py-2 rounded-full text-white font-semibold ${getVerdictColor(result.verdict)}`}>
                {result.verdict}
              </div>
              <p className="mt-4 text-muted-foreground">{result.summary}</p>
            </div>

            {/* Claims */}
            {result.claims.length > 0 && (
              <div className="bg-card rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-6">Analyzed Claims</h2>
                <div className="space-y-4">
                  {result.claims.map((claim, idx) => (
                    <div key={idx} className="p-4 border border-border rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className={`text-2xl ${
                          claim.verdict.includes('True') ? '✓ text-green-500' :
                          claim.verdict.includes('False') ? '✗ text-red-500' :
                          '? text-yellow-500'
                        }`}>
                          {claim.verdict.includes('True') ? '✓' :
                           claim.verdict.includes('False') ? '✗' : '?'}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium mb-2">{claim.text}</p>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span className={`font-semibold ${getVerdictColor(claim.verdict)} text-white px-2 py-1 rounded`}>
                              {claim.verdict}
                            </span>
                            <span>Confidence: {claim.confidence}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {result.sources.length > 0 && (
              <div className="bg-card rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-6">Verified Sources</h2>
                <div className="space-y-3">
                  {result.evidence.slice(0, 5).map((ev, idx) => (
                    <a
                      key={idx}
                      href={ev.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 border border-border rounded-lg hover:border-primary transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🔗</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-primary hover:underline">
                            {ev.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {ev.snippet}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new URL(ev.source).hostname}
                          </p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-muted-foreground">
        <p>Powered by AI • Tavily Search • LangChain</p>
      </footer>
    </div>
  )
}
