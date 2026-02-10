import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const toolId = formData.get("toolId") as string | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    // Convert file to Buffer (pdf-parse v1.1.1 uses Buffer)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Import pdf-parse/lib directly to avoid test file loading issue on Vercel
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const data = await pdfParse(buffer);
    
    // Clean up the text
    let cleanText = data.text
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
      .trim();

    // Save document to database for library
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        toolId: toolId || "pdf-qa",
        content: cleanText.slice(0, 50000), // Store first 50k chars
        metadata: {
          pages: data.numpages,
          info: data.info,
        },
      },
    });

    return NextResponse.json({
      text: cleanText.slice(0, 100000), // Limit to 100k chars
      pages: data.numpages,
      info: data.info,
      documentId: document.id,
    });
  } catch (error: any) {
    console.error("PDF parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF", details: error.message },
      { status: 500 }
    );
  }
}
