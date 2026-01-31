// Pinecone Vector Database Client
// Used for heavy RAG operations (PDF Q&A, Past Paper Analysis)

import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone client
let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

// Index name for Kay AI documents
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'kay-ai-docs';

// Get or create index
export async function getIndex() {
  const client = getPineconeClient();
  return client.index(INDEX_NAME);
}

// Vector dimension (OpenAI text-embedding-3-small = 1536)
export const VECTOR_DIMENSION = 1536;

// Types
export interface VectorMetadata {
  userId: string;
  documentId: string;
  chunkId: string;
  chunkIndex: number;
  pageNumber?: number;
  content: string;
  filename?: string;
  toolId?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface UpsertVectorInput {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

// Upsert vectors to Pinecone
export async function upsertVectors(
  vectors: UpsertVectorInput[],
  namespace?: string
): Promise<void> {
  const index = await getIndex();
  const ns = namespace ? index.namespace(namespace) : index;
  
  // Pinecone has a limit of 100 vectors per upsert
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await ns.upsert(batch as any);
  }
}

// Query similar vectors
export async function queryVectors(
  queryVector: number[],
  topK: number = 5,
  filter?: Record<string, string>,
  namespace?: string
): Promise<QueryResult[]> {
  const index = await getIndex();
  const ns = namespace ? index.namespace(namespace) : index;
  
  const results = await ns.query({
    vector: queryVector,
    topK,
    filter,
    includeMetadata: true,
  });

  return (results.matches || []).map(match => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata as unknown as VectorMetadata,
  }));
}

// Delete vectors by ID
export async function deleteVectors(
  ids: string[],
  namespace?: string
): Promise<void> {
  const index = await getIndex();
  const ns = namespace ? index.namespace(namespace) : index;
  
  await ns.deleteMany(ids);
}

// Delete all vectors for a document
export async function deleteDocumentVectors(
  documentId: string,
  namespace?: string
): Promise<void> {
  const index = await getIndex();
  const ns = namespace ? index.namespace(namespace) : index;
  
  // Delete by filter (all chunks of a document)
  await ns.deleteMany({
    documentId: { $eq: documentId },
  });
}

// Delete all vectors for a user
export async function deleteUserVectors(
  userId: string,
  namespace?: string
): Promise<void> {
  const index = await getIndex();
  const ns = namespace ? index.namespace(namespace) : index;
  
  await ns.deleteMany({
    userId: { $eq: userId },
  });
}

// Get embedding from OpenAI
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for embeddings');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Get embeddings for multiple texts
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for embeddings');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

// Chunk text into smaller pieces
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  
  return chunks;
}

// Process document and store in Pinecone
export async function processAndStoreDocument(
  documentId: string,
  userId: string,
  content: string,
  filename: string,
  toolId?: string,
  namespace?: string
): Promise<string[]> {
  // Chunk the content
  const chunks = chunkText(content);
  
  // Get embeddings for all chunks
  const embeddings = await getEmbeddings(chunks);
  
  // Prepare vectors for upsert
  const vectors: UpsertVectorInput[] = chunks.map((chunk, index) => ({
    id: `${documentId}-chunk-${index}`,
    values: embeddings[index],
    metadata: {
      userId,
      documentId,
      chunkId: `${documentId}-chunk-${index}`,
      chunkIndex: index,
      content: chunk,
      filename,
      toolId,
    },
  }));
  
  // Upsert to Pinecone
  await upsertVectors(vectors, namespace);
  
  return vectors.map(v => v.id);
}

// Search documents for a query
export async function searchDocuments(
  query: string,
  userId: string,
  topK: number = 5,
  toolId?: string,
  namespace?: string
): Promise<QueryResult[]> {
  // Get embedding for query
  const queryVector = await getEmbedding(query);
  
  // Build filter
  const filter: Record<string, string> = { userId };
  if (toolId) {
    filter.toolId = toolId;
  }
  
  // Query Pinecone
  return queryVectors(queryVector, topK, filter, namespace);
}
