// pgvector utilities for Neon Postgres
// Used for simple embedding operations (Flashcards, Quiz)
// Note: For heavy RAG, use Pinecone instead

import { prisma } from '@/lib/prisma';
import { getEmbedding } from './pinecone';

// Enable pgvector extension (run once on database setup)
export async function enablePgVector(): Promise<void> {
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
}

// Store embedding in DocumentChunk
// Note: Prisma doesn't directly support vector type, so we use raw queries
export async function storeChunkWithEmbedding(
  documentId: string,
  chunkIndex: number,
  content: string,
  pageNumber?: number,
  metadata?: Record<string, unknown>
): Promise<string> {
  // Get embedding
  const embedding = await getEmbedding(content);
  
  // Create chunk with embedding using raw SQL
  const result = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "DocumentChunk" (
      id, "documentId", "chunkIndex", content, "pageNumber", metadata, "vectorId", "createdAt"
    )
    VALUES (
      gen_random_uuid()::text,
      ${documentId},
      ${chunkIndex},
      ${content},
      ${pageNumber},
      ${metadata ? JSON.stringify(metadata) : null}::jsonb,
      NULL,
      NOW()
    )
    RETURNING id
  `;
  
  const chunkId = result[0].id;
  
  // Store embedding separately if pgvector is enabled
  // This is a fallback for simple vector operations
  try {
    await prisma.$executeRaw`
      UPDATE "DocumentChunk"
      SET embedding = ${embedding}::vector
      WHERE id = ${chunkId}
    `;
  } catch {
    // pgvector not enabled, skip embedding storage
    console.warn('pgvector extension not enabled, skipping embedding storage');
  }
  
  return chunkId;
}

// Similarity search using pgvector
export async function similaritySearch(
  query: string,
  userId: string,
  limit: number = 5,
  documentId?: string
): Promise<Array<{
  id: string;
  content: string;
  score: number;
  pageNumber?: number;
  documentId: string;
}>> {
  try {
    // Get query embedding
    const queryEmbedding = await getEmbedding(query);
    
    // Build the query with optional document filter
    let results;
    
    if (documentId) {
      results = await prisma.$queryRaw<Array<{
        id: string;
        content: string;
        score: number;
        pageNumber: number | null;
        documentId: string;
      }>>`
        SELECT 
          dc.id,
          dc.content,
          1 - (dc.embedding <=> ${queryEmbedding}::vector) as score,
          dc."pageNumber",
          dc."documentId"
        FROM "DocumentChunk" dc
        JOIN "Document" d ON dc."documentId" = d.id
        WHERE d."userId" = ${userId}
          AND dc."documentId" = ${documentId}
          AND dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> ${queryEmbedding}::vector
        LIMIT ${limit}
      `;
    } else {
      results = await prisma.$queryRaw<Array<{
        id: string;
        content: string;
        score: number;
        pageNumber: number | null;
        documentId: string;
      }>>`
        SELECT 
          dc.id,
          dc.content,
          1 - (dc.embedding <=> ${queryEmbedding}::vector) as score,
          dc."pageNumber",
          dc."documentId"
        FROM "DocumentChunk" dc
        JOIN "Document" d ON dc."documentId" = d.id
        WHERE d."userId" = ${userId}
          AND dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> ${queryEmbedding}::vector
        LIMIT ${limit}
      `;
    }
    
    return results.map(r => ({
      ...r,
      pageNumber: r.pageNumber ?? undefined,
    }));
  } catch (error) {
    console.error('pgvector similarity search failed:', error);
    // Fallback to text search if pgvector fails
    return fallbackTextSearch(query, userId, limit, documentId);
  }
}

// Fallback text search when pgvector is not available
async function fallbackTextSearch(
  query: string,
  userId: string,
  limit: number = 5,
  documentId?: string
): Promise<Array<{
  id: string;
  content: string;
  score: number;
  pageNumber?: number;
  documentId: string;
}>> {
  const chunks = await prisma.documentChunk.findMany({
    where: {
      document: {
        userId,
        ...(documentId ? { id: documentId } : {}),
      },
      content: {
        contains: query,
        mode: 'insensitive',
      },
    },
    take: limit,
    select: {
      id: true,
      content: true,
      pageNumber: true,
      documentId: true,
    },
  });
  
  return chunks.map(chunk => ({
    id: chunk.id,
    content: chunk.content,
    score: 0.5, // Arbitrary score for text match
    pageNumber: chunk.pageNumber ?? undefined,
    documentId: chunk.documentId,
  }));
}

// Get all chunks for a document
export async function getDocumentChunks(documentId: string) {
  return prisma.documentChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: 'asc' },
  });
}

// Delete all chunks for a document
export async function deleteDocumentChunks(documentId: string) {
  return prisma.documentChunk.deleteMany({
    where: { documentId },
  });
}

// Create a document record
export async function createDocument(
  userId: string,
  filename: string,
  contentType: string,
  size: number,
  content?: string,
  toolId?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.document.create({
    data: {
      userId,
      filename,
      contentType,
      size,
      content,
      toolId,
      metadata: metadata as any,
    },
  });
}

// Get user's documents
export async function getUserDocuments(
  userId: string,
  toolId?: string,
  limit: number = 50
) {
  return prisma.document.findMany({
    where: {
      userId,
      ...(toolId ? { toolId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      _count: {
        select: { chunks: true },
      },
    },
  });
}

// Delete a document and its chunks
export async function deleteDocument(documentId: string, userId: string) {
  // Verify ownership
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });
  
  if (!doc) {
    throw new Error('Document not found or access denied');
  }
  
  // Delete document (chunks cascade)
  return prisma.document.delete({
    where: { id: documentId },
  });
}
