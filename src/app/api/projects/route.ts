import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatWithTier } from "@/lib/ai-providers";

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 8; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

// POST: Save a new project
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { toolId, inputData, outputData, settings, inputPreview } = body;

    if (!toolId || !inputData || !outputData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Dedup: skip if same tool + recent save within 30 seconds
    const recentProject = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        toolId,
        createdAt: { gte: new Date(Date.now() - 30000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentProject) {
      return NextResponse.json({
        success: true,
        slug: recentProject.slug,
        caption: recentProject.caption,
        id: recentProject.id,
        skipped: true,
      });
    }

    // Generate slug (ensure uniqueness)
    let slug = generateSlug();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.project.findUnique({ where: { slug } });
      if (!existing) break;
      slug = generateSlug();
      attempts++;
    }

    // AI-generate caption
    let caption = "Untitled Project";
    try {
      const preview = (inputPreview || "").slice(0, 200);
      if (preview.trim()) {
        const captionResult = await chatWithTier(
          "fast",
          "Generate a short 3-5 word title for this work. Return ONLY the title, nothing else. No quotes, no punctuation at the end.",
          preview
        );
        if (captionResult) {
          caption = captionResult.trim().replace(/^["']|["']$/g, "");
          if (caption.length > 80) caption = caption.slice(0, 80);
        }
      }
    } catch {
      // Silent fail - use default caption
    }

    const project = await prisma.project.create({
      data: {
        slug,
        userId: session.user.id,
        toolId,
        caption,
        inputData,
        outputData,
        settings: settings || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      slug: project.slug,
      caption: project.caption,
      id: project.id,
    });
  } catch (error) {
    console.error("[Projects] Save error:", error);
    return NextResponse.json(
      { error: "Failed to save project" },
      { status: 500 }
    );
  }
}

// GET: List all projects for current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        slug: true,
        toolId: true,
        caption: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("[Projects] List error:", error);
    return NextResponse.json(
      { error: "Failed to list projects" },
      { status: 500 }
    );
  }
}
