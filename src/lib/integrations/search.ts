// Web Search Integration
// Wrapper for Tavily, Exa.ai, or other search APIs

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string;
  author?: string;
}

export interface SearchOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeDomains?: string[];
  excludeDomains?: string[];
  type?: 'general' | 'academic' | 'news';
}

// Tavily Search API
export async function searchWithTavily(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is not set');
  }
  
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: options.searchDepth || 'basic',
      max_results: options.maxResults || 10,
      include_domains: options.includeDomains,
      exclude_domains: options.excludeDomains,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return data.results.map((result: any) => ({
    title: result.title,
    url: result.url,
    content: result.content,
    score: result.score,
    publishedDate: result.published_date,
  }));
}

// Exa.ai Search API (for academic/research)
export async function searchWithExa(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('EXA_API_KEY environment variable is not set');
  }
  
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query,
      numResults: options.maxResults || 10,
      type: options.type === 'academic' ? 'keyword' : 'neural',
      includeDomains: options.includeDomains,
      excludeDomains: options.excludeDomains,
      contents: {
        text: true,
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Exa search failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return data.results.map((result: any) => ({
    title: result.title,
    url: result.url,
    content: result.text || result.snippet || '',
    score: result.score,
    publishedDate: result.publishedDate,
    author: result.author,
  }));
}

// Academic paper search domains
const ACADEMIC_DOMAINS = [
  'scholar.google.com',
  'pubmed.ncbi.nlm.nih.gov',
  'arxiv.org',
  'sciencedirect.com',
  'springer.com',
  'nature.com',
  'researchgate.net',
  'jstor.org',
  'ieee.org',
  'acm.org',
];

// Search academic papers specifically
export async function searchAcademic(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  // Try Exa first (better for academic)
  try {
    return await searchWithExa(query, {
      maxResults,
      type: 'academic',
      includeDomains: ACADEMIC_DOMAINS,
    });
  } catch {
    // Fallback to Tavily with academic domain filter
    return await searchWithTavily(query, {
      maxResults,
      searchDepth: 'advanced',
      includeDomains: ACADEMIC_DOMAINS,
    });
  }
}

// General web search (uses available API)
export async function webSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  // Try Tavily first (generally faster)
  if (process.env.TAVILY_API_KEY) {
    try {
      return await searchWithTavily(query, options);
    } catch (error) {
      console.error('Tavily search failed:', error);
    }
  }
  
  // Fallback to Exa
  if (process.env.EXA_API_KEY) {
    return await searchWithExa(query, options);
  }
  
  throw new Error('No search API configured. Set TAVILY_API_KEY or EXA_API_KEY.');
}

// Semantic Scholar API (free, no API key required)
export async function searchSemanticScholar(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const response = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,abstract,url,authors,year`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Semantic Scholar search failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return (data.data || []).map((paper: any) => ({
    title: paper.title,
    url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
    content: paper.abstract || '',
    author: paper.authors?.map((a: any) => a.name).join(', '),
    publishedDate: paper.year?.toString(),
  }));
}
