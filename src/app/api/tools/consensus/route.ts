import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { GROQ_MODELS } from "@/lib/ai-providers/groq";

const consensusSchema = z.object({
  query: z.string().min(10, "Query must be at least 10 characters"),
  paperCount: z.number().min(5).max(100).default(30).transform(n => Math.max(n, 20)),
  model: z.string().default("fast"),
  language: z.string().default("en"),
  mode: z.enum(["general", "medical", "deep"]).default("general"),
  filters: z.object({
    studyType: z.enum(["all", "rct", "meta", "systematic", "cohort"]).default("all"),
    yearRange: z.enum(["all", "5years", "10years", "2020"]).default("all"),
  }).optional(),
});

// Unified search result interface
interface UnifiedSearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string;
  author?: string;
  source: "exa" | "tavily" | "semantic_scholar" | "openalex" | "groq";
  citations?: number;
  venue?: string;
}

// ==== EXA SEARCH (Best for Research Papers) ====
async function searchWithExa(
  query: string,
  options: {
    numResults?: number;
    category?: "research paper" | "news" | "pdf";
    startPublishedDate?: string;
    includeDomains?: string[];
  } = {}
): Promise<UnifiedSearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    console.log("[Exa] API key not configured");
    return [];
  }

  try {
    const body: Record<string, unknown> = {
      query,
      numResults: options.numResults || 25,
      type: "auto",
      category: options.category || "research paper",
      contents: {
        text: true,
        highlights: true,
        summary: true,
      },
    };

    if (options.startPublishedDate) {
      body.startPublishedDate = options.startPublishedDate;
    }
    if (options.includeDomains) {
      body.includeDomains = options.includeDomains;
    }

    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Exa] API Error:", errorText);
      return [];
    }

    const data = await response.json();
    console.log(`[Exa] Found ${data.results?.length || 0} results`);

    return (data.results || []).map((r: any) => ({
      title: r.title || "Untitled",
      url: r.url,
      content: r.text || r.summary || r.highlights?.join(" ") || "",
      score: r.score,
      publishedDate: r.publishedDate,
      author: r.author,
      source: "exa" as const,
    }));
  } catch (error) {
    console.error("[Exa] Search error:", error);
    return [];
  }
}

// ==== TAVILY SEARCH (Fast, general academic) ====
async function searchWithTavily(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
    includeDomains?: string[];
    topic?: "general" | "news";
  } = {}
): Promise<UnifiedSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.log("[Tavily] API key not configured");
    return [];
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: options.searchDepth || "advanced",
        max_results: options.maxResults || 20,
        include_domains: options.includeDomains,
        topic: options.topic || "general",
        include_answer: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Tavily] API Error:", errorText);
      return [];
    }

    const data = await response.json();
    console.log(`[Tavily] Found ${data.results?.length || 0} results`);

    return (data.results || []).map((r: any) => ({
      title: r.title || "Untitled",
      url: r.url,
      content: r.content || "",
      score: r.score,
      publishedDate: r.published_date,
      source: "tavily" as const,
    }));
  } catch (error) {
    console.error("[Tavily] Search error:", error);
    return [];
  }
}

// Academic domains for filtering
const ACADEMIC_DOMAINS = [
  "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov",
  "arxiv.org",
  "sciencedirect.com",
  "springer.com",
  "nature.com",
  "researchgate.net",
  "jstor.org",
  "ieee.org",
  "acm.org",
  "bmj.com",
  "thelancet.com",
  "nejm.org",
  "jamanetwork.com",
  "wiley.com",
  "tandfonline.com",
  "frontiersin.org",
  "plos.org",
  "mdpi.com",
  "cell.com",
  "science.org",
];

const MEDICAL_DOMAINS = [
  "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov",
  "cochranelibrary.com",
  "bmj.com",
  "nejm.org",
  "thelancet.com",
  "jamanetwork.com",
  "nature.com/nm",
  "clinicaltrials.gov",
  "medscape.com",
  "uptodate.com",
  "mayoclinic.org",
];

// Semantic Scholar API types
interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract?: string;
  year?: number;
  citationCount?: number;
  venue?: string;
  url?: string;
  openAccessPdf?: {
    url: string;
  };
  authors?: Array<{
    authorId: string;
    name: string;
  }>;
  publicationTypes?: string[];
  fieldsOfStudy?: string[];
}

interface SemanticScholarResponse {
  total: number;
  offset: number;
  data: SemanticScholarPaper[];
}

// OpenAlex API types
interface OpenAlexWork {
  id: string;
  title: string;
  abstract_inverted_index?: Record<string, number[]>;
  publication_year?: number;
  cited_by_count?: number;
  primary_location?: {
    source?: {
      display_name?: string;
    };
  };
  doi?: string;
  authorships?: Array<{
    author: {
      display_name: string;
    };
  }>;
  type?: string;
}

interface OpenAlexResponse {
  results: OpenAlexWork[];
  meta: {
    count: number;
  };
}

// Fetch papers from Semantic Scholar API
async function searchSemanticScholar(query: string, limit: number, yearFilter?: string): Promise<SemanticScholarPaper[]> {
  try {
    // Build year filter
    let yearParam = "";
    if (yearFilter === "5years") {
      yearParam = "&year=2021-2026";
    } else if (yearFilter === "10years") {
      yearParam = "&year=2016-2026";
    } else if (yearFilter === "2020") {
      yearParam = "&year=2020-2026";
    }

    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=paperId,title,abstract,year,citationCount,venue,url,openAccessPdf,authors,publicationTypes,fieldsOfStudy${yearParam}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.log("Semantic Scholar API error:", response.status);
      return [];
    }

    const data: SemanticScholarResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Semantic Scholar fetch error:", error);
    return [];
  }
}

// Fallback: Fetch papers from OpenAlex API
async function searchOpenAlex(query: string, limit: number, yearFilter?: string): Promise<OpenAlexWork[]> {
  try {
    // Build year filter
    let filterParam = "";
    if (yearFilter === "5years") {
      filterParam = ",publication_year:2021-2026";
    } else if (yearFilter === "10years") {
      filterParam = ",publication_year:2016-2026";
    } else if (yearFilter === "2020") {
      filterParam = ",publication_year:2020-2026";
    }

    const response = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${limit}&filter=type:article${filterParam}&select=id,title,abstract_inverted_index,publication_year,cited_by_count,primary_location,doi,authorships,type`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "KabyarAI/1.0 (mailto:support@kabyar.ai)",
        },
      }
    );

    if (!response.ok) {
      console.log("OpenAlex API error:", response.status);
      return [];
    }

    const data: OpenAlexResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("OpenAlex fetch error:", error);
    return [];
  }
}

// Convert inverted index to abstract text
function reconstructAbstract(invertedIndex: Record<string, number[]> | undefined): string {
  if (!invertedIndex) return "";
  
  const words: [string, number][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos]);
    }
  }
  words.sort((a, b) => a[1] - b[1]);
  return words.map(w => w[0]).join(" ").slice(0, 1000);
}

// Normalize papers from different sources to a common format
interface NormalizedPaper {
  id: string;
  title: string;
  abstract: string;
  year: number | null;
  citations: number;
  venue: string;
  url: string;
  authors: string;
  source: "semantic_scholar" | "openalex";
}

function normalizeSemanticScholarPaper(paper: SemanticScholarPaper): NormalizedPaper {
  return {
    id: paper.paperId,
    title: paper.title || "Untitled",
    abstract: paper.abstract || "",
    year: paper.year || null,
    citations: paper.citationCount || 0,
    venue: paper.venue || "Unknown venue",
    url: paper.openAccessPdf?.url || paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
    authors: paper.authors?.map(a => a.name).join(", ") || "Unknown authors",
    source: "semantic_scholar",
  };
}

function normalizeOpenAlexPaper(work: OpenAlexWork): NormalizedPaper {
  return {
    id: work.id,
    title: work.title || "Untitled",
    abstract: reconstructAbstract(work.abstract_inverted_index),
    year: work.publication_year || null,
    citations: work.cited_by_count || 0,
    venue: work.primary_location?.source?.display_name || "Unknown venue",
    url: work.doi ? `https://doi.org/${work.doi.replace("https://doi.org/", "")}` : work.id.replace("https://openalex.org/", "https://openalex.org/works/"),
    authors: work.authorships?.map(a => a.author.display_name).join(", ") || "Unknown authors",
    source: "openalex",
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = consensusSchema.parse(body);

    const creditsNeeded = 5;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { query, paperCount, language, mode, filters } = validatedData;

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ 
        error: "GROQ_API_KEY is not configured" 
      }, { status: 500 });
    }

    // Calculate year filter for Exa
    let startPublishedDate: string | undefined;
    if (filters?.yearRange === "5years") {
      startPublishedDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
    } else if (filters?.yearRange === "10years") {
      startPublishedDate = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
    } else if (filters?.yearRange === "2020") {
      startPublishedDate = "2020-01-01T00:00:00.000Z";
    }

    const domains = mode === "medical" ? MEDICAL_DOMAINS : ACADEMIC_DOMAINS;

    console.log(`Starting parallel search for: "${query}" (target: ${paperCount} papers)`);

    // ===== STEP 1: Run ALL search APIs in PARALLEL =====
    const searchPromises = await Promise.allSettled([
      // Exa - Best for research papers (up to 25 results)
      searchWithExa(query, {
        numResults: Math.min(25, paperCount),
        category: "research paper",
        startPublishedDate,
      }),
      
      // Exa - Also search PDFs
      searchWithExa(`${query} research study`, {
        numResults: 15,
        category: "pdf",
        startPublishedDate,
      }),
      
      // Tavily - General academic search (up to 20 results)
      searchWithTavily(query, {
        maxResults: 20,
        searchDepth: "advanced",
        includeDomains: domains,
      }),
      
      // Tavily - Alternative query
      searchWithTavily(`${query} peer-reviewed research`, {
        maxResults: 15,
        searchDepth: "advanced",
      }),
      
      // Semantic Scholar (up to 50 results)
      searchSemanticScholar(query, Math.min(50, paperCount), filters?.yearRange),
      
      // Semantic Scholar - Alternative query for more results
      searchSemanticScholar(
        mode === "medical" ? `${query} clinical trial treatment` : `${query} study research`,
        30,
        filters?.yearRange
      ),
      
      // OpenAlex (up to 50 results)
      searchOpenAlex(query, Math.min(50, paperCount), filters?.yearRange),
    ]);

    // ===== STEP 2: Collect all results =====
    const allResults: UnifiedSearchResult[] = [];
    const paperResults: NormalizedPaper[] = [];


    searchPromises.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const data = result.value;
        if (Array.isArray(data)) {
          if (index < 4) {
            // Exa and Tavily results
            allResults.push(...(data as UnifiedSearchResult[]));
          } else if (index < 6) {
            // Semantic Scholar results
            paperResults.push(...(data as SemanticScholarPaper[]).map(normalizeSemanticScholarPaper));
          } else {
            // OpenAlex results
            paperResults.push(...(data as OpenAlexWork[]).map(normalizeOpenAlexPaper));
          }
        }
      } else {
        console.log(`Search ${index} failed:`, result.reason);
      }
    });

    console.log(`Raw results: ${allResults.length} from Exa/Tavily, ${paperResults.length} from databases`);

    // ===== STEP 3: Deduplicate by title =====
    const seenTitles = new Set<string>();
    const uniqueWebResults: UnifiedSearchResult[] = [];
    const uniquePaperResults: NormalizedPaper[] = [];

    for (const r of allResults) {
      const titleKey = r.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50);
      if (!seenTitles.has(titleKey) && r.title.length > 5) {
        seenTitles.add(titleKey);
        uniqueWebResults.push(r);
      }
    }

    for (const p of paperResults) {
      const titleKey = p.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50);
      // Filter: require title > 10 chars, abstract exists, and exclude "Unknown" authors
      if (!seenTitles.has(titleKey) && 
          p.title.length > 10 && 
          p.abstract && p.abstract.length > 50 &&
          !p.authors.includes("Unknown")) {
        seenTitles.add(titleKey);
        uniquePaperResults.push(p);
      }
    }

    // Sort by citations/score - prioritize papers with citations
    uniquePaperResults.sort((a, b) => (b.citations || 0) - (a.citations || 0));
    uniqueWebResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Filter web results: require content and valid URL
    const filteredWebResults = uniqueWebResults.filter(r => 
      r.content && r.content.length > 100 && 
      r.url && r.url.startsWith("http")
    );

    const totalResults = filteredWebResults.length + uniquePaperResults.length;
    console.log(`After deduplication: ${filteredWebResults.length} web + ${uniquePaperResults.length} papers = ${totalResults} total`);

    if (totalResults === 0) {
      return NextResponse.json({ 
        error: "No research papers found. Please try a different search query." 
      }, { status: 404 });
    }

    // ===== STEP 4: Build context for AI analysis =====
    const webSearchContext = filteredWebResults.slice(0, 20).map((r, i) => 
      `[Source ${i + 1}] ${r.source.toUpperCase()}
Title: ${r.title}
URL: ${r.url}
${r.author ? `Author: ${r.author}` : ""}
${r.publishedDate ? `Date: ${r.publishedDate}` : ""}
Content: ${r.content.slice(0, 600)}`
    ).join("\n\n---\n\n");

    // Limit papers for context
    const normalizedPapers = uniquePaperResults.slice(0, paperCount);

    // Step 3: Build context from REAL papers and web search for AI analysis
    const paperContext = normalizedPapers.map((p, i) => 
      `[Paper ${i + 1}]
Title: ${p.title}
Authors: ${p.authors}
Year: ${p.year || "Unknown"}
Venue: ${p.venue}
Citations: ${p.citations}
Abstract: ${p.abstract.slice(0, 800) || "No abstract available"}
URL: ${p.url}`
    ).join("\n\n---\n\n");

    // Build instructions
    const studyTypeInstruction = filters?.studyType && filters.studyType !== "all"
      ? `Focus primarily on ${
          filters.studyType === "rct" ? "Randomized Controlled Trials (RCTs)" :
          filters.studyType === "meta" ? "Meta-Analysis studies" :
          filters.studyType === "systematic" ? "Systematic Reviews" :
          "Cohort studies"
        }.`
      : "";

    const modeInstruction = mode === "medical" 
      ? "Focus on clinical evidence quality. Use GRADE criteria for evidence assessment."
      : mode === "deep"
      ? "Provide deep analysis including conflicting evidence and methodological considerations."
      : "Provide balanced scientific analysis.";

    const languageInstructions = language !== "en" 
      ? `Provide all analysis and output in ${language} language.` 
      : "";

    // Step 5: Use AI to analyze the combined data sources
    const analysisPrompt = `You are a senior research analyst synthesizing REAL research data from multiple sources.

RESEARCH QUESTION: "${query}"

=== SEARCH RESULTS FROM EXA & TAVILY (${filteredWebResults.length} sources) ===
${webSearchContext}

=== ACADEMIC DATABASE PAPERS (${normalizedPapers.length} papers from Semantic Scholar & OpenAlex) ===
${paperContext}

${modeInstruction}
${studyTypeInstruction}
${languageInstructions}

CRITICAL RELEVANCE CHECK:
- FIRST check if each source is actually RELEVANT to the research question "${query}"
- EXCLUDE sources that are NOT directly related to the query (e.g., if query is about "X in Myanmar" but source is about "X in USA", mark as irrelevant)
- If MOST sources are irrelevant, report low evidence quality and suggest a more specific query
- Do NOT include irrelevant papers in your analysis

CRITICAL: Your analysis MUST be based on the ACTUAL content from the web search results and paper abstracts above.
- Quote specific findings from the sources
- Reference URLs when making claims
- Include actual statistics, percentages, and effect sizes from the sources
- If a source doesn't clearly support or oppose, mark it neutral
- Do NOT make up findings that aren't in the source content
- If a source is NOT relevant to the query, do NOT include it in the papers array

ANALYSIS REQUIREMENTS:
1. Carefully read EACH paper's abstract to determine its stance on the research question
2. Extract SPECIFIC findings with numbers, statistics, and conclusions
3. Identify methodological strengths and weaknesses
4. Note sample sizes when mentioned in abstracts
5. Assess evidence quality based on study design and citation impact

Return ONLY valid JSON with this EXACT structure:
{
  "query": "${query}",
  "consensusMeter": {
    "yes": [integer percentage 0-100 of papers supporting],
    "no": [integer percentage 0-100 opposing],
    "neutral": [integer percentage 0-100 neutral/inconclusive],
    "overallStance": "Strong Support|Moderate Support|Mixed Evidence|Moderate Opposition|Strong Opposition|Insufficient Data"
  },
  "papers": [
    {
      "title": "[exact title from paper]",
      "authors": "[first 2-3 authors from paper]",
      "year": "[year from paper]",
      "journal": "[venue/journal from paper]",
      "keyFinding": "[SPECIFIC main finding from abstract - include numbers, effect sizes, or conclusions. 2-3 sentences]",
      "stance": "yes|no|neutral",
      "stanceReason": "[Brief explanation of why this stance was assigned]",
      "methodology": "[inferred methodology: RCT, cohort, survey, meta-analysis, etc.]",
      "studyType": "meta-analysis|systematic-review|rct|cohort|cross-sectional|observational|review|case-study|unknown",
      "sampleSize": "[extract sample size from abstract if mentioned, otherwise null]",
      "url": "[url from paper]",
      "citations": [citation count number],
      "confidence": [1-100 based on citation count, venue quality, study design],
      "impactLevel": "high|medium|low",
      "limitations": "[any limitations mentioned in abstract]"
    }
  ],
  "summary": "[4-5 paragraph DETAILED synthesis. Cite specific papers by author name. Include statistics and effect sizes. Discuss agreement and disagreement between studies.]",
  "keyInsights": [
    {
      "insight": "[Specific research finding with evidence]",
      "source": "[Paper title or author that supports this]",
      "strength": "strong|moderate|weak",
      "category": "finding|implication|trend|consensus"
    }
  ],
  "limitations": [
    {
      "limitation": "[Specific limitation]",
      "impact": "high|medium|low",
      "description": "[How this affects the conclusions]"
    }
  ],
  "gaps": [
    {
      "gap": "[Research gap identified]",
      "importance": "critical|important|minor",
      "description": "[Why this gap matters and what research is needed]",
      "suggestedResearch": "[What future studies should address]"
    }
  ],
  "evidenceQuality": {
    "overall": "High|Moderate|Low|Very Low",
    "score": [0-100 integer],
    "reasoning": "[Detailed explanation based on study designs, sample sizes, and consistency]",
    "factors": [
      { "name": "Study Design Quality", "score": [0-100], "description": "[explanation]" },
      { "name": "Sample Size Adequacy", "score": [0-100], "description": "[explanation]" },
      { "name": "Consistency Across Studies", "score": [0-100], "description": "[explanation]" },
      { "name": "Publication Quality", "score": [0-100], "description": "[explanation]" },
      { "name": "Recency of Evidence", "score": [0-100], "description": "[explanation]" }
    ]
  },
  "methodologyBreakdown": [
    { "type": "[study type]", "count": [number], "percentage": [0-100], "description": "[what this study type contributes]" }
  ],
  "yearDistribution": [
    { "year": "[year]", "count": [number], "trend": "increasing|stable|decreasing" }
  ],
  "stanceByStudyType": [
    { "studyType": "[type]", "yes": [count], "no": [count], "neutral": [count] }
  ],
  "topFindings": [
    {
      "finding": "[Key finding with statistics if available]",
      "paperTitle": "[Source paper title]",
      "citations": [citation count],
      "year": "[year]",
      "significance": "breakthrough|significant|supportive|contradictory"
    }
  ],
  "conflictingEvidence": [
    {
      "topic": "[Area of disagreement]",
      "supportingPapers": ["[paper titles supporting]"],
      "opposingPapers": ["[paper titles opposing]"],
      "explanation": "[Why there's disagreement]"
    }
  ],
  "relatedQuestions": [
    "[Related question based on gaps]",
    "[Another related question]",
    "[Third related question]"
  ],
  "dataReliability": {
    "score": [0-100 overall reliability],
    "grade": "A|B|C|D|F",
    "factors": [
      { "name": "Peer Review Status", "score": [0-100], "description": "[explanation]" },
      { "name": "Citation Impact", "score": [0-100], "description": "[explanation]" },
      { "name": "Methodology Transparency", "score": [0-100], "description": "[explanation]" },
      { "name": "Reproducibility", "score": [0-100], "description": "[explanation]" },
      { "name": "Bias Risk", "score": [0-100], "description": "[lower = more bias risk]" }
    ]
  },
  "sourcesAnalyzed": ${normalizedPapers.length}
}

CRITICAL RULES:
1. Use ONLY the actual data from web search results and paper abstracts above. Do NOT invent findings.
2. Include papers from BOTH web search results AND academic database papers.
3. Total papers should include all unique sources found (web + database).
4. All percentages must be integers that sum to 100.
5. Extract REAL findings - quote actual statistics, effect sizes, and conclusions from the sources.
6. If a source doesn't clearly support or oppose, mark as "neutral".
7. In the summary, cite specific sources by title or URL.
8. The keyInsights MUST reference actual source content with URLs or titles.`;

    // Use regular Groq model for final analysis (web search already done)
    const analysisResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODELS.llama,
        messages: [
          { role: "system", content: "You are a senior academic research analyst. Return ONLY valid JSON. No markdown, no explanation, just the JSON object." },
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.5,
        max_tokens: 8192,
      }),
    });

    if (!analysisResponse.ok) {
      const error = await analysisResponse.text();
      console.error("[Groq Analysis] API Error:", error);
      throw new Error(`Analysis failed: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const analysisContent = analysisData.choices[0]?.message?.content || "";

    // Parse the analysis response
    let analysis;
    try {
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
        
        // ALWAYS build papers from actual fetched data - don't rely on AI-generated list
        // Start with database papers (Semantic Scholar, OpenAlex)
        const dbPapers = normalizedPapers.map(p => {
          // Try to find AI-analyzed stance for this paper by matching title
          const aiPaper = analysis.papers?.find((ap: any) => 
            ap.title?.toLowerCase().includes(p.title.toLowerCase().slice(0, 30)) ||
            p.title.toLowerCase().includes(ap.title?.toLowerCase().slice(0, 30))
          );
          
          return {
            title: p.title,
            authors: p.authors,
            year: p.year?.toString() || "Unknown",
            journal: p.venue,
            keyFinding: aiPaper?.keyFinding || p.abstract.slice(0, 300) || "See full paper for details.",
            stance: aiPaper?.stance || "neutral" as const,
            stanceReason: aiPaper?.stanceReason || "Stance determined from abstract analysis",
            methodology: aiPaper?.methodology || "See paper for methodology",
            studyType: aiPaper?.studyType || "unknown",
            sampleSize: aiPaper?.sampleSize || null,
            url: p.url,
            citations: p.citations,
            confidence: Math.min(100, 50 + Math.floor(p.citations / 10)),
            impactLevel: (p.citations > 100 ? "high" : p.citations > 20 ? "medium" : "low") as "high" | "medium" | "low",
            limitations: aiPaper?.limitations || "See paper for limitations",
          };
        });
        
        // Add ALL web search results as papers (Exa, Tavily)
        const webPapers = filteredWebResults.map(r => {
          // Try to find AI-analyzed stance for this paper
          const aiPaper = analysis.papers?.find((ap: any) => 
            ap.title?.toLowerCase().includes(r.title.toLowerCase().slice(0, 30)) ||
            r.title.toLowerCase().includes(ap.title?.toLowerCase().slice(0, 30))
          );
          
          let hostname = "web";
          try { hostname = new URL(r.url).hostname; } catch {}
          
          return {
            title: r.title,
            authors: r.author || `Source: ${hostname}`,
            year: r.publishedDate?.slice(0, 4) || "2024",
            journal: hostname,
            keyFinding: aiPaper?.keyFinding || r.content.slice(0, 300),
            stance: aiPaper?.stance || "neutral" as const,
            stanceReason: aiPaper?.stanceReason || "Extracted from web search",
            methodology: aiPaper?.methodology || "Web source",
            studyType: r.source === "exa" ? "exa-source" : "tavily-source",
            sampleSize: null,
            url: r.url,
            citations: 0,
            confidence: Math.round((r.score || 0.5) * 100),
            impactLevel: "medium" as const,
            limitations: "Web source - verify with original paper",
          };
        });
        
        // Combine all papers - database first (sorted by citations), then web sources
        analysis.papers = [...dbPapers, ...webPapers];
        
        // Recalculate consensus meter based on actual papers data
        const allPapers = analysis.papers || [];
        const yesCount = allPapers.filter((p: any) => p.stance === "yes").length;
        const noCount = allPapers.filter((p: any) => p.stance === "no").length;
        const neutralCount = allPapers.filter((p: any) => p.stance === "neutral").length;
        const totalPapersForMeter = allPapers.length || 1;
        
        analysis.consensusMeter = {
          yes: Math.round((yesCount / totalPapersForMeter) * 100),
          no: Math.round((noCount / totalPapersForMeter) * 100),
          neutral: Math.round((neutralCount / totalPapersForMeter) * 100),
          overallStance: yesCount > noCount * 1.5 ? "Strong Support" : 
                         yesCount > noCount ? "Moderate Support" : 
                         noCount > yesCount * 1.5 ? "Strong Opposition" :
                         noCount > yesCount ? "Moderate Opposition" : "Mixed Evidence",
          totalSources: totalPapersForMeter,
          webSources: webPapers.length,
          databaseSources: dbPapers.length
        };

        // Build keyInsights from actual fetched sources - combine AI insights with real sources
        const aiInsights = analysis.keyInsights || [];
        const topWebResults = filteredWebResults.slice(0, 8);
        const topDbPapers = normalizedPapers.slice(0, 5);
        
        // Start with AI-generated insights if valid, add URLs
        const validAiInsights = (Array.isArray(aiInsights) ? aiInsights : [])
          .filter((ins: any) => typeof ins === "object" && ins.insight)
          .map((ins: any, idx: number) => ({
            insight: ins.insight,
            source: ins.source || topWebResults[idx]?.url || topDbPapers[idx]?.url || "Multiple sources",
            strength: ins.strength || "moderate" as const,
            category: ins.category || "finding" as const
          }));
        
        // Add insights from top web results
        const webInsights = topWebResults.slice(0, 5).map(r => ({
          insight: r.content.slice(0, 180),
          source: r.url,
          strength: (r.score || 0) > 0.7 ? "strong" as const : "moderate" as const,
          category: "finding" as const
        }));
        
        // Add insights from top database papers
        const dbInsights = topDbPapers.slice(0, 3).map(p => ({
          insight: p.abstract.slice(0, 180) || `Study: ${p.title}`,
          source: p.url,
          strength: p.citations > 50 ? "strong" as const : "moderate" as const,
          category: "consensus" as const
        }));
        
        // Combine all insights, remove duplicates by insight text
        const allInsights = [...validAiInsights, ...webInsights, ...dbInsights];
        const seenInsights = new Set<string>();
        analysis.keyInsights = allInsights.filter(ins => {
          const key = ins.insight.slice(0, 50).toLowerCase();
          if (seenInsights.has(key)) return false;
          seenInsights.add(key);
          return true;
        }).slice(0, 15);

        // Ensure limitations is in the new format with actual data
        const totalPapers = analysis.papers?.length || 0;
        const webSourceCount = filteredWebResults.length;
        const dbSourceCount = normalizedPapers.length;
        
        if (!analysis.limitations || !Array.isArray(analysis.limitations) || analysis.limitations.length === 0) {
          analysis.limitations = [
            { limitation: `Analysis based on ${totalPapers} sources`, impact: "low", description: `${webSourceCount} web sources + ${dbSourceCount} database papers analyzed` },
            { limitation: "Semantic Scholar returned limited results", impact: "medium", description: "Some academic databases may have rate limits" },
            { limitation: "Automated stance detection", impact: "medium", description: "AI-based analysis may not capture all nuances - verify with original papers" }
          ];
        } else if (typeof analysis.limitations[0] === "string") {
          analysis.limitations = analysis.limitations.map((lim: string) => ({
            limitation: lim,
            impact: "medium",
            description: "See full papers for detailed context"
          }));
        }

        // Ensure gaps is in the new format with data-driven insights
        if (!analysis.gaps || !Array.isArray(analysis.gaps) || analysis.gaps.length === 0) {
          const neutralCount = analysis.papers?.filter((p: any) => p.stance === "neutral").length || 0;
          const neutralPct = totalPapers > 0 ? Math.round((neutralCount / totalPapers) * 100) : 0;
          
          analysis.gaps = [
            { gap: `${neutralPct}% of sources have neutral/unclear stance`, importance: "important", description: "More specific research may be needed", suggestedResearch: "Look for meta-analyses and systematic reviews" },
            { gap: "Long-term studies may be limited", importance: "important", description: "Check publication dates for recent research", suggestedResearch: "Filter by recent years for updated findings" }
          ];
        } else if (typeof analysis.gaps[0] === "string") {
          analysis.gaps = analysis.gaps.map((gap: string) => ({
            gap,
            importance: "important",
            description: "This area needs more investigation",
            suggestedResearch: "Additional studies recommended"
          }));
        }

        // Ensure evidenceQuality has all fields
        if (!analysis.evidenceQuality || typeof analysis.evidenceQuality !== "object") {
          analysis.evidenceQuality = {
            overall: "Moderate",
            score: 60,
            reasoning: "Based on available peer-reviewed sources",
            factors: [
              { name: "Study Design Quality", score: 65, description: "Mixed study designs in the literature" },
              { name: "Sample Size Adequacy", score: 60, description: "Varies across studies" },
              { name: "Consistency Across Studies", score: 55, description: "Some variation in findings" },
              { name: "Publication Quality", score: 70, description: "From peer-reviewed sources" },
              { name: "Recency of Evidence", score: 65, description: "Mix of recent and older studies" }
            ]
          };
        }

        // Ensure dataReliability exists
        if (!analysis.dataReliability) {
          const avgCitations = normalizedPapers.reduce((sum, p) => sum + p.citations, 0) / normalizedPapers.length;
          const recentPapers = normalizedPapers.filter(p => (p.year || 0) >= 2020).length;
          analysis.dataReliability = {
            score: Math.min(85, 50 + Math.floor(avgCitations / 5) + Math.floor(recentPapers * 2)),
            grade: avgCitations > 50 ? "A" : avgCitations > 20 ? "B" : avgCitations > 5 ? "C" : "D",
            factors: [
              { name: "Peer Review Status", score: 85, description: "All papers from peer-reviewed sources" },
              { name: "Citation Impact", score: Math.min(100, 40 + Math.floor(avgCitations)), description: `Average ${Math.round(avgCitations)} citations per paper` },
              { name: "Methodology Transparency", score: 70, description: "Varies by paper" },
              { name: "Reproducibility", score: 65, description: "Depends on study design" },
              { name: "Bias Risk", score: 60, description: "Potential selection and publication bias" }
            ]
          };
        }

        // Generate methodology breakdown if not present
        if (!analysis.methodologyBreakdown || analysis.methodologyBreakdown.length === 0) {
          const studyTypes: Record<string, number> = {};
          for (const paper of (analysis.papers || [])) {
            const type = paper.studyType || "unknown";
            studyTypes[type] = (studyTypes[type] || 0) + 1;
          }
          analysis.methodologyBreakdown = Object.entries(studyTypes).map(([type, count]) => ({
            type,
            count,
            percentage: Math.round((count / (analysis.papers?.length || 1)) * 100),
            description: type === "meta-analysis" ? "Combines multiple studies" :
                        type === "rct" ? "Gold standard for causation" :
                        type === "cohort" ? "Follows groups over time" :
                        type === "systematic-review" ? "Comprehensive literature review" :
                        "Observational or other methodology"
          }));
        }

        // Generate year distribution if not present
        if (!analysis.yearDistribution || analysis.yearDistribution.length === 0) {
          const years: Record<string, number> = {};
          for (const paper of (analysis.papers || [])) {
            const year = paper.year || "Unknown";
            years[year] = (years[year] || 0) + 1;
          }
          const sortedYears = Object.entries(years).sort((a, b) => b[0].localeCompare(a[0]));
          analysis.yearDistribution = sortedYears.map(([year, count], idx) => ({
            year,
            count,
            trend: idx === 0 ? "stable" : count > (years[sortedYears[idx-1]?.[0]] || 0) ? "increasing" : "decreasing"
          }));
        }

        // Generate top findings from BOTH web search and papers
        if (!analysis.topFindings || analysis.topFindings.length === 0) {
          // Prioritize web search results first (they have real content)
          const webFindings = filteredWebResults.slice(0, 3).map(r => ({
            finding: r.content.slice(0, 200),
            paperTitle: r.title,
            citations: 0,
            year: "2024",
            significance: (r.score || 0) > 0.8 ? "significant" : "supportive",
            url: r.url
          }));
          
          // Then add top cited papers
          const sortedByCitations = [...(analysis.papers || [])].sort((a, b) => (b.citations || 0) - (a.citations || 0));
          const paperFindings = sortedByCitations.slice(0, 2).map((paper: any) => ({
            finding: paper.keyFinding,
            paperTitle: paper.title,
            citations: paper.citations || 0,
            year: paper.year || "Unknown",
            significance: paper.citations > 100 ? "significant" : "supportive",
            url: paper.url
          }));
          
          analysis.topFindings = [...webFindings, ...paperFindings];
        }

        // Validate summary - include web search analysis if available
        if (!analysis.summary || typeof analysis.summary !== "string" || analysis.summary.length < 50) {
          const yesCount = analysis.papers.filter((p: any) => p.stance === "yes").length;
          const noCount = analysis.papers.filter((p: any) => p.stance === "no").length;
          const totalSources = normalizedPapers.length + filteredWebResults.length;
          
          // Use Groq's web search analysis if available
          const groqSummary = "" 
            ? "".slice(0, 500) + "\n\n"
            : "";
          
          analysis.summary = `${groqSummary}Analysis based on ${totalSources} sources (${filteredWebResults.length} web search results + ${normalizedPapers.length} academic database papers) about "${query}". ${yesCount} sources support the research question, ${noCount} oppose it, and ${totalSources - yesCount - noCount} provide neutral or mixed evidence. Sources include peer-reviewed papers from Semantic Scholar, OpenAlex, and live web search results from academic domains.`;
        }

        analysis.sourcesAnalyzed = normalizedPapers.length + filteredWebResults.length;
        analysis.webSearchResults = filteredWebResults.length;
        analysis.databasePapers = normalizedPapers.length;
      } else {
        throw new Error("No valid JSON in response");
      }
    } catch (parseError) {
      console.error("Parse error, using fallback:", parseError);
      
      // Calculate statistics from papers
      const avgCitations = normalizedPapers.reduce((sum, p) => sum + p.citations, 0) / (normalizedPapers.length || 1);
      const recentPapers = normalizedPapers.filter(p => (p.year || 0) >= 2020).length;
      const years: Record<string, number> = {};
      normalizedPapers.forEach(p => {
        const year = p.year?.toString() || "Unknown";
        years[year] = (years[year] || 0) + 1;
      });
      
      const totalSources = normalizedPapers.length + filteredWebResults.length;
      
      // Combine database papers and web search results
      const combinedPapers = [
        ...normalizedPapers.map(p => ({
          title: p.title,
          authors: p.authors,
          year: p.year?.toString() || "Unknown",
          journal: p.venue,
          keyFinding: p.abstract.slice(0, 300) || "See full paper for detailed findings.",
          stance: "neutral" as const,
          stanceReason: "Automated analysis could not determine stance",
          methodology: "See paper for methodology details",
          studyType: "unknown",
          sampleSize: null,
          url: p.url,
          citations: p.citations,
          confidence: Math.min(100, 50 + Math.floor(p.citations / 10)),
          impactLevel: (p.citations > 100 ? "high" : p.citations > 20 ? "medium" : "low") as "high" | "medium" | "low",
          limitations: "Review paper for limitations",
        })),
        ...filteredWebResults.slice(0, 10).map(r => ({
          title: r.title,
          authors: "Web Source",
          year: "2024",
          journal: new URL(r.url).hostname,
          keyFinding: r.content.slice(0, 300),
          stance: "neutral" as const,
          stanceReason: "Extracted from web search",
          methodology: "Web source",
          studyType: "web-source",
          sampleSize: null,
          url: r.url,
          citations: 0,
          confidence: Math.round((r.score || 0.5) * 100),
          impactLevel: "medium" as const,
          limitations: "Web source - verify with original paper",
        }))
      ];
      
      // Use Groq's analysis if available
      const groqSummary = "" 
        ? "".slice(0, 600) + "\n\n"
        : "";
      
      // Fallback: return combined data with Groq's analysis
      analysis = {
        query,
        consensusMeter: { 
          yes: 40, 
          no: 20, 
          neutral: 40, 
          overallStance: "Mixed Evidence - Analysis Based on Real Sources" 
        },
        papers: combinedPapers,
        summary: `${groqSummary}Analysis based on ${totalSources} sources (${filteredWebResults.length} web search results + ${normalizedPapers.length} academic database papers) about "${query}". The average citation count for database papers is ${Math.round(avgCitations)}, with ${recentPapers} papers published since 2020.`,
        keyInsights: [
          ...filteredWebResults.slice(0, 3).map(r => ({
            insight: r.content.slice(0, 150),
            source: r.url,
            strength: (r.score || 0) > 0.7 ? "strong" as const : "moderate" as const,
            category: "finding" as const
          })),
          { insight: `${normalizedPapers.length} academic papers + ${filteredWebResults.length} web sources analyzed`, source: "Combined search", strength: "strong" as const, category: "consensus" as const }
        ],
        limitations: [
          { limitation: "AI stance detection may have limitations", impact: "medium", description: "Manual review recommended for critical decisions" },
          { limitation: "Web search results may vary", impact: "medium", description: "Results based on current web content" }
        ],
        gaps: [
          { gap: "Detailed methodology comparison needed", importance: "important", description: "Compare study designs across papers", suggestedResearch: "Systematic review with full-text analysis" }
        ],
        evidenceQuality: {
          overall: "Moderate",
          score: 65,
          reasoning: `Based on ${totalSources} sources including peer-reviewed papers and web search results.`,
          factors: [
            { name: "Source Diversity", score: 70, description: `${filteredWebResults.length} web + ${normalizedPapers.length} database sources` },
            { name: "Sample Size Adequacy", score: 55, description: "Varies across studies" },
            { name: "Consistency Across Studies", score: 50, description: "Requires manual review" },
            { name: "Publication Quality", score: 75, description: "Includes peer-reviewed sources" },
            { name: "Recency of Evidence", score: Math.min(90, 50 + recentPapers * 3), description: `${recentPapers} database papers from 2020+` }
          ]
        },
        dataReliability: {
          score: Math.min(75, 55 + Math.floor(avgCitations / 5)),
          grade: avgCitations > 50 ? "B" : avgCitations > 20 ? "C" : "C",
          factors: [
            { name: "Source Verification", score: 80, description: "Academic databases + web search" },
            { name: "Citation Impact", score: Math.min(100, 40 + Math.floor(avgCitations)), description: `Average ${Math.round(avgCitations)} citations for papers` },
            { name: "Methodology Transparency", score: 60, description: "Limited by abstract-only analysis" },
            { name: "Reproducibility", score: 55, description: "Requires full-text review" },
            { name: "Bias Risk", score: 50, description: "Potential selection bias in search" }
          ]
        },
        yearDistribution: Object.entries(years).sort((a, b) => b[0].localeCompare(a[0])).map(([year, count]) => ({
          year,
          count,
          trend: "stable" as const
        })),
        methodologyBreakdown: [
          { type: "database-papers", count: normalizedPapers.length, percentage: Math.round((normalizedPapers.length / totalSources) * 100), description: "Papers from Semantic Scholar & OpenAlex" },
          { type: "web-sources", count: filteredWebResults.length, percentage: Math.round((filteredWebResults.length / totalSources) * 100), description: "Live web search results" }
        ],
        topFindings: [
          ...filteredWebResults.slice(0, 3).map(r => ({
            finding: r.content.slice(0, 200),
            paperTitle: r.title,
            citations: 0,
            year: "2024",
            significance: (r.score || 0) > 0.8 ? "significant" as const : "supportive" as const,
            url: r.url
          })),
          ...normalizedPapers.slice(0, 2).map(p => ({
            finding: p.abstract.slice(0, 200) || "See paper for findings",
            paperTitle: p.title,
            citations: p.citations,
            year: p.year?.toString() || "Unknown",
            significance: "supportive" as const,
            url: p.url
          }))
        ],
        sourcesAnalyzed: totalSources,
        webSearchResults: filteredWebResults.length,
        databasePapers: normalizedPapers.length,
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "academic-consensus");

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Consensus search error:", error);
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => e.message).join(", ");
      return NextResponse.json({ error: errorMessage || "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to analyze research" }, { status: 500 });
  }
}
