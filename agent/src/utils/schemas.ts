import { z } from "zod";

export const WebSearchResultSchema = z.object({
  title: z.string().min(1),
  url: z.url(),
  snippet: z.string().optional().default(""),
});

export const WebSearchResultsSchema = z.array(WebSearchResultSchema).max(10);
export type WebSearchResult = z.infer<typeof WebSearchResultsSchema>;

export const OpenUrlInputSchema = z.object({
  url: z.string().url(),
});
export const OpenUrlOutputSchema = z.object({
  url: z.string().url(),
  content: z.string().min(1),
});
export const SummarizeInputSchema = z.object({
  text: z.string().min(50, "Need a Bit moree Text To Summarize"),
});
export const SummarizeOutputSchema = z.object({
  summary: z.string().min(1),
});
// Fact-Check Schemas
export const FactCheckInputSchema = z
  .object({
    content: z
      .string()
      .min(10, "Please provide content to fact-check")
      .optional(),
    url: z.string().url().optional(),
  })
  .refine((data) => data.content || data.url, {
    message: "Either content or url must be provided",
  });
export type FactCheckInput = z.infer<typeof FactCheckInputSchema>;

export const ClaimSchema = z.object({
  text: z.string(),
  verdict: z.enum([
    "True",
    "Mostly True",
    "Mixed",
    "Mostly False",
    "False",
    "Unverifiable",
  ]),
  confidence: z.number().min(0).max(100),
});

export const EvidenceSchema = z.object({
  source: z.string().url(),
  title: z.string(),
  snippet: z.string(),
  supports: z.boolean(), // true if supports claim, false if contradicts
});

export const FactCheckOutputSchema = z.object({
  credibilityScore: z.number().min(0).max(100),
  verdict: z.enum([
    "True",
    "Mostly True",
    "Mixed",
    "Mostly False",
    "False",
    "Unverifiable",
  ]),
  claims: z.array(ClaimSchema),
  evidence: z.array(EvidenceSchema),
  sources: z.array(z.string().url()),
  summary: z.string(),
});
export type FactCheckOutput = z.infer<typeof FactCheckOutputSchema>;

// Legacy search schemas (keeping for backward compatibility)
export const SearchInputSchema = z.object({
  q: z.string().min(1, "please ask a specific query"),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const SearchAnswerSchema = z.object({
  answer: z.string().min(1),
  sources: z.array(z.url()).default([]),
});

export type SearchAnswer = z.infer<typeof SearchAnswerSchema>;
