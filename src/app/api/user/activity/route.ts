import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Map database feature names to correct URL slugs and display names
// Key = feature name saved in database, Value = { slug, name, category }
const toolMapping: Record<string, { slug: string; name: string; category: string }> = {
  // RAG & Documents
  "pdf-qa": { slug: "pdf-qa", name: "PDF Q&A Sniper", category: "rag" },
  "quiz-generator": { slug: "quiz-generator", name: "Quiz Generator", category: "rag" },
  "past-paper-analyzer": { slug: "past-paper", name: "Past Paper Analyzer", category: "rag" },
  "past-paper": { slug: "past-paper", name: "Past Paper Analyzer", category: "rag" },
  "flashcard-maker": { slug: "flashcard-maker", name: "Flashcard Maker", category: "rag" },
  "resume-tailor": { slug: "resume-tailor", name: "Resume/CV Tailor", category: "rag" },
  
  // Research
  "academic-consensus": { slug: "academic-consensus", name: "Academic Consensus", category: "research" },
  "research-gap": { slug: "research-gap", name: "Research Gap Finder", category: "research" },
  "job-matcher": { slug: "job-matcher", name: "Job Description Matcher", category: "research" },
  
  // Media
  "youtube-summarizer": { slug: "youtube-summarizer", name: "YouTube Summarizer", category: "media" },
  "pdf-to-podcast": { slug: "pdf-podcast", name: "PDF to Podcast", category: "media" },
  "pdf-podcast": { slug: "pdf-podcast", name: "PDF to Podcast", category: "media" },
  "lecture-organizer": { slug: "lecture-organizer", name: "Lecture Organizer", category: "media" },
  "viva-simulator": { slug: "viva-simulator", name: "Viva Simulator", category: "media" },
  
  // Visual
  "mind-map": { slug: "mind-map", name: "Mind Map Generator", category: "visual" },
  "timeline": { slug: "timeline", name: "Interactive Timeline", category: "visual" },
  "flowchart": { slug: "flowchart", name: "Text to Flowchart", category: "visual" },
  "lab-report": { slug: "lab-report", name: "Lab Report Generator", category: "visual" },
  
  // Writing
  "ai-detector": { slug: "ai-detector", name: "AI Detector", category: "writing" },
  "detect": { slug: "ai-detector", name: "AI Detector", category: "writing" },
  "humanizer": { slug: "humanizer", name: "Content Humanizer", category: "writing" },
  "humanize": { slug: "humanizer", name: "Content Humanizer", category: "writing" },
  "humanize-diff": { slug: "humanizer", name: "Content Humanizer", category: "writing" },
  "paraphraser": { slug: "paraphraser", name: "Safe Paraphraser", category: "writing" },
  "image-solve": { slug: "image-solve", name: "Image to Solution", category: "writing" },
  "roast-assignment": { slug: "roast-assignment", name: "Roast My Assignment", category: "writing" },
  "code-visualizer": { slug: "code-visualizer", name: "Code Logic Visualizer", category: "writing" },
  "explain-error": { slug: "explain-error", name: "Explain Error", category: "writing" },
  "devils-advocate": { slug: "devils-advocate", name: "Devil's Advocate", category: "writing" },
  "vocabulary-upgrader": { slug: "vocabulary-upgrader", name: "Vocabulary Upgrader", category: "writing" },
  "cold-email": { slug: "cold-email", name: "Cold Email Generator", category: "writing" },
  
  // Other AI features (these might not have dedicated pages yet)
  "tutor": { slug: "ai-detector", name: "AI Tutor", category: "writing" },
  "study-guide": { slug: "ai-detector", name: "Study Guide", category: "writing" },
  "slides": { slug: "ai-detector", name: "Slides Generator", category: "writing" },
  "essay": { slug: "ai-detector", name: "Essay Writer", category: "writing" },
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recent usage from database
    const usageRecords = await prisma.usage.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Transform to activity format
    const activities = usageRecords
      .filter(record => record.feature !== "ad_reward") // Filter out ad rewards
      .map((record) => {
        // Look up the tool info from our mapping
        const toolInfo = toolMapping[record.feature];
        
        // Debug log to see what's happening
        console.log(`[Activity API] Feature: "${record.feature}" -> Tool: ${toolInfo ? `${toolInfo.category}/${toolInfo.slug}` : "NOT FOUND"}`);
        
        if (toolInfo) {
          return {
            id: record.id,
            toolSlug: toolInfo.slug,
            toolName: toolInfo.name,
            category: toolInfo.category,
            timestamp: record.createdAt,
            inputPreview: `Used ${record.model} model`,
            creditsUsed: record.tokens || 1,
          };
        }
        
        // Fallback for unknown tools - skip unknown tools
        console.warn(`[Activity API] Unknown feature: "${record.feature}" - skipping`);
        return null;
      })
      .filter(Boolean); // Remove null entries

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json({ activities: [] });
  }
}
