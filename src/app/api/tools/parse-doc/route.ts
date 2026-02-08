import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (ext !== ".doc" && ext !== ".docx" && !file.type.includes("word")) {
      return NextResponse.json({ error: "File must be a DOC or DOCX document" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use mammoth to extract text from DOC/DOCX
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });

    let cleanText = result.value
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Limit to 100k chars
    cleanText = cleanText.slice(0, 100000);

    return NextResponse.json({
      text: cleanText,
      filename: file.name,
      size: file.size,
      messages: result.messages?.length || 0,
    });
  } catch (error: unknown) {
    console.error("DOC parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse document", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
