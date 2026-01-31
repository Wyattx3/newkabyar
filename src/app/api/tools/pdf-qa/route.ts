import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";
import OpenAI from "openai";

const pdfQASchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters"),
  pdfContent: z.string().min(100, "PDF content must be at least 100 characters"),
  model: z.string().default("fast"),
  language: z.string().default("en"),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = pdfQASchema.parse(body);

    const creditsNeeded = 4;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { question, pdfContent, model, language } = validatedData;

    // For simple RAG, we'll use a sliding window approach to find relevant sections
    // Split content into chunks
    const chunkSize = 3000;
    const overlap = 500;
    const chunks: { text: string; startIndex: number }[] = [];
    
    for (let i = 0; i < pdfContent.length; i += chunkSize - overlap) {
      chunks.push({
        text: pdfContent.slice(i, i + chunkSize),
        startIndex: i,
      });
    }

    // Simple keyword matching to find most relevant chunks
    const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const scoredChunks = chunks.map(chunk => {
      const lowerChunk = chunk.text.toLowerCase();
      let score = 0;
      questionWords.forEach(word => {
        const matches = (lowerChunk.match(new RegExp(word, 'g')) || []).length;
        score += matches;
      });
      return { ...chunk, score };
    });

    // Sort by relevance and take top chunks (more context for better answers)
    const relevantChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .sort((a, b) => a.startIndex - b.startIndex); // Re-sort by position for context

    // If no relevant chunks found, use the first few chunks as context
    const finalChunks = relevantChunks.length > 0 && relevantChunks[0].score > 0 
      ? relevantChunks 
      : chunks.slice(0, 5);

    const context = finalChunks.map(c => c.text).join("\n\n---\n\n");

    const languageInstructions = language !== "en" 
      ? `Provide the answer in ${language} language.` 
      : "";

    // Use simple plain text prompt - more reliable across all models
    const systemPrompt = `You are a helpful document Q&A assistant. Answer questions based ONLY on the provided document content.
${languageInstructions}

Instructions:
- Give a clear, comprehensive answer based on the document
- If the document doesn't contain relevant information, say so
- Be concise but thorough`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `DOCUMENT CONTENT:\n${context}\n\nQUESTION: ${question}\n\nPlease answer the question based on the document above.`,
      session.user.id
    );

    // Clean up the response - remove any garbage characters
    const cleanResponse = (text: string) => {
      if (!text) return "";
      // Remove excessive repetitive characters
      let cleaned = text.replace(/(.)\1{10,}/g, '$1$1$1');
      // Remove garbage unicode
      cleaned = cleaned.replace(/[》《〉〈]{3,}/g, '');
      // Trim and limit length
      return cleaned.trim().slice(0, 3000);
    };

    // Extract source name from chunk if available
    const extractSourceName = (text: string): string | null => {
      const match = text.match(/\[Source: ([^\]]+)\]/);
      return match ? match[1] : null;
    };

    // Find the most relevant sentence(s) containing question keywords
    const findRelevantExcerpt = (text: string, keywords: string[]): string => {
      // Remove source tag
      const cleanText = text.replace(/\[Source: [^\]]+\]\n?/, '').trim();
      
      // Split into sentences
      const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
      
      if (sentences.length === 0) {
        return cleanText.slice(0, 200) + (cleanText.length > 200 ? "..." : "");
      }
      
      // Score each sentence by keyword matches
      const scoredSentences = sentences.map((sentence, idx) => {
        const lowerSentence = sentence.toLowerCase();
        let score = 0;
        keywords.forEach(keyword => {
          if (lowerSentence.includes(keyword)) {
            score += 2;
          }
        });
        return { sentence, score, idx };
      });
      
      // Get best matching sentences
      const bestSentences = scoredSentences
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);
      
      if (bestSentences.length === 0) {
        // No keyword matches, return first meaningful sentence
        const firstMeaningful = sentences.find(s => s.length > 50) || sentences[0];
        return firstMeaningful.slice(0, 250) + (firstMeaningful.length > 250 ? "..." : "");
      }
      
      // Combine best sentences (in order)
      const orderedBest = bestSentences.sort((a, b) => a.idx - b.idx);
      const excerpt = orderedBest.map(s => s.sentence.trim()).join(" ");
      
      return excerpt.slice(0, 300) + (excerpt.length > 300 ? "..." : "");
    };

    // Create references from the relevant chunks used
    const references = finalChunks
      .filter(chunk => ('score' in chunk) ? (chunk as any).score > 0 : true)
      .slice(0, 5) // Top 5 most relevant
      .map((chunk, index) => {
        const excerpt = findRelevantExcerpt(chunk.text, questionWords);
        const score = ('score' in chunk) ? (chunk as any).score : 1;
        
        return {
          id: index + 1,
          source: extractSourceName(chunk.text) || "Document",
          excerpt: excerpt,
          relevance: Math.min(100, Math.round((score / (questionWords.length * 2)) * 100)),
        };
      });

    // Generate follow-up questions using AI based on document context
    const generateFollowUps = async (docContext: string, q: string, a: string): Promise<string[]> => {
      try {
        const followUpPrompt = `Based on this document excerpt and the Q&A, generate 3 relevant follow-up questions the user might ask.

Document excerpt (first 1500 chars):
${docContext.slice(0, 1500)}

User asked: "${q}"
Answer given: "${a.slice(0, 500)}"

Generate exactly 3 short, specific follow-up questions that:
1. Are directly related to the document content
2. Would help the user understand the document better
3. Are different from the original question

Return ONLY the 3 questions, one per line, no numbering or bullets.`;

        const followUpResult = await chatWithTier(
          "fast",
          "You generate concise follow-up questions. Return only the questions, one per line.",
          followUpPrompt,
          session.user.id
        );

        // Parse the result - split by newlines and clean up
        const questions = followUpResult
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 10 && line.length < 150)
          .filter(line => !line.match(/^\d+[\.\)]/)) // Remove numbered items
          .filter(line => !line.startsWith('-') && !line.startsWith('•'))
          .slice(0, 3);

        return questions.length > 0 ? questions : [
          "What are the main points of this document?",
          "Can you explain this in simpler terms?",
          "What are the key takeaways?"
        ];
      } catch (error) {
        console.error("Failed to generate follow-ups:", error);
        return [
          "What are the main points of this document?",
          "Can you explain this in simpler terms?",
          "What are the key takeaways?"
        ];
      }
    };

    // Generate smart follow-up questions based on document context
    const followUps = await generateFollowUps(context, question, result);

    const answer = {
      answer: cleanResponse(result),
      confidence: "high",
      references: references,
      followUps: followUps,
      unanswerable: false,
    };

    await deductCredits(session.user.id, creditsNeeded, "pdf-qa");

    return NextResponse.json(answer);
  } catch (error: any) {
    console.error("PDF Q&A error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to answer question" }, { status: 500 });
  }
}
