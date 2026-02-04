import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth");

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".doc") && !fileName.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Only DOC and DOCX files are supported" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse DOCX using mammoth
    const result = await mammoth.extractRawText({ buffer });
    let text = result.value || "";

    // Clean up the text
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Limit text length (max 100k characters)
    if (text.length > 100000) {
      text = text.slice(0, 100000);
    }

    return NextResponse.json({
      success: true,
      text,
      fileName: file.name,
      characterCount: text.length,
    });
  } catch (error) {
    console.error("DOC parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse document" },
      { status: 500 }
    );
  }
}
