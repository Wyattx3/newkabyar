import { NextRequest, NextResponse } from "next/server";

// Use Groq Compound API for news generation with web search capabilities
const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
if (!GROQ_API_KEY) {
  console.warn("GROQ_API_KEY not configured for news generation");
}

// Category colors
const categoryColors: Record<string, string> = {
  "Programming": "bg-blue-500",
  "AI/ML": "bg-purple-500",
  "Mathematics": "bg-indigo-500",
  "Web Development": "bg-cyan-500",
  "Data Science": "bg-green-500",
  "Physics": "bg-orange-500",
  "Chemistry": "bg-red-500",
  "Biology": "bg-emerald-500",
  "Computer Science": "bg-violet-500",
  "English": "bg-pink-500",
  "Business": "bg-amber-500",
  "Literature": "bg-rose-500",
  "History": "bg-slate-500",
  "Economics": "bg-teal-500",
  "default": "bg-gray-500",
};

function extractJSON(text: string): string {
  // Try to extract JSON from various response formats
  let cleaned = text.trim();

  // Remove markdown code blocks
  if (cleaned.includes("```")) {
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    }
  }

  // Try to find JSON object in the text
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subjects, schoolName, major, educationLevel, studyGoal } = body;

    const userContext = `
User Profile:
- Subjects of Interest: ${subjects?.join(", ") || "Programming, Mathematics"}
- School/University: ${schoolName || "Not specified"}
- Major: ${major || "Not specified"}
- Education Level: ${educationLevel || "undergraduate"}
- Study Goal: ${studyGoal || "Learn and improve skills"}
    `.trim();

    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured");
    }

    const systemPrompt = `You are a helpful assistant that generates personalized educational news and updates for students. 
Based on the user's profile, generate 4 relevant and interesting news/updates that would help them in their learning journey.

Each news item should be:
1. Relevant to their subjects of interest or field of study
2. Educational and informative
3. Current and trending in their field (use web search to find the latest information)
4. Actionable or insightful

IMPORTANT: Respond ONLY with valid JSON, no markdown, no extra text. Format:
{
  "news": [
    {
      "id": "1",
      "category": "Subject Category",
      "title": "News Title (max 80 chars)",
      "summary": "Brief summary of the news (max 150 chars)",
      "fullContent": "Detailed content about this news/update (2-3 paragraphs explaining the topic, its importance, and how it relates to the student's learning)",
      "actionTip": "A practical tip or action the student can take based on this news",
      "relatedTopics": ["topic1", "topic2"]
    }
  ]
}`;

    const userQuery = `Generate 4 personalized educational news/updates for this student:\n\n${userContext}\n\nSearch the web for the latest trends and updates in their field. Return ONLY valid JSON.`;

    // Groq Compound system — do NOT pass temperature/max_tokens as they are unsupported
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "groq/compound-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API error: ${response.status} - ${errorText}`);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("No content in Groq response:", JSON.stringify(data).slice(0, 500));
      throw new Error("No response from AI");
    }

    // Extract and parse JSON from response
    const jsonContent = extractJSON(content);
    
    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("JSON parse error. Raw content:", content.slice(0, 1000));
      throw new Error("Failed to parse AI response as JSON");
    }

    if (!parsed.news || !Array.isArray(parsed.news)) {
      console.error("Invalid news format:", JSON.stringify(parsed).slice(0, 500));
      throw new Error("Invalid news format from AI");
    }
    
    // Add colors and time to news items
    const now = Date.now();
    const newsWithMeta = parsed.news.map((item: any, index: number) => ({
      ...item,
      id: `ai-news-${now}-${index}`,
      color: categoryColors[item.category] || categoryColors.default,
      time: "Just now",
      timestamp: now,
      source: "AI Generated",
    }));

    return NextResponse.json({ news: newsWithMeta, source: "ai" });
  } catch (error) {
    console.error("Error generating news:", error);
    
    // Fallback news
    const fallbackNow = Date.now();
    const fallbackNews = [
      {
        id: "fallback-1",
        category: "Programming",
        title: "Top Programming Languages to Learn in 2026",
        summary: "Discover which programming languages are most in-demand for developers.",
        fullContent: "As we move into 2026, several programming languages continue to dominate the tech industry. Python remains the top choice for data science and AI applications, while JavaScript and TypeScript lead in web development.\n\nRust and Go are gaining popularity for systems programming due to their performance and safety features. For mobile development, Swift and Kotlin are essential skills.\n\nTo stay competitive, focus on mastering one language deeply while having familiarity with others in your area of interest.",
        actionTip: "Pick one new language to learn this month and build a small project with it.",
        relatedTopics: ["Python", "JavaScript", "Career Development"],
        color: "bg-blue-500",
        time: "Just now",
        timestamp: fallbackNow,
        source: "Fallback",
      },
      {
        id: "fallback-2",
        category: "AI/ML",
        title: "Understanding Large Language Models for Students",
        summary: "A beginner-friendly guide to how AI models like GPT work.",
        fullContent: "Large Language Models (LLMs) have revolutionized how we interact with AI. These models are trained on vast amounts of text data to understand and generate human-like text.\n\nAs a student, understanding LLMs opens doors to exciting career opportunities. Key concepts to learn include transformers, attention mechanisms, and fine-tuning.\n\nStart with free courses on platforms like Coursera or fast.ai to build your foundation in AI and machine learning.",
        actionTip: "Try building a simple chatbot using OpenAI's API to understand how LLMs work.",
        relatedTopics: ["Machine Learning", "Natural Language Processing", "Deep Learning"],
        color: "bg-purple-500",
        time: "Just now",
        timestamp: fallbackNow,
        source: "Fallback",
      },
      {
        id: "fallback-3",
        category: "Mathematics",
        title: "How Math Powers Modern Technology",
        summary: "Explore the essential role of mathematics in tech innovations.",
        fullContent: "Mathematics is the backbone of modern technology. From algorithms that power search engines to cryptography securing your online transactions, math is everywhere.\n\nLinear algebra is crucial for machine learning, calculus helps optimize algorithms, and statistics enables data-driven decisions. Discrete mathematics forms the foundation of computer science.\n\nStrengthening your math skills will give you a significant advantage in any tech career path you choose.",
        actionTip: "Practice solving algorithm problems on LeetCode to apply your math skills.",
        relatedTopics: ["Linear Algebra", "Algorithms", "Cryptography"],
        color: "bg-indigo-500",
        time: "Just now",
        timestamp: fallbackNow,
        source: "Fallback",
      },
      {
        id: "fallback-4",
        category: "Web Development",
        title: "The Rise of Full-Stack Development Skills",
        summary: "Why knowing both frontend and backend is valuable in 2026.",
        fullContent: "Full-stack development skills are increasingly valuable as companies seek versatile developers who can work across the entire application stack.\n\nModern frameworks like Next.js blur the line between frontend and backend, making it easier to become a full-stack developer. Understanding databases, APIs, and deployment is essential.\n\nStart by mastering one stack (like React + Node.js + PostgreSQL) before expanding your knowledge to other technologies.",
        actionTip: "Build a complete full-stack project and deploy it to showcase your skills.",
        relatedTopics: ["React", "Node.js", "Database Design"],
        color: "bg-cyan-500",
        time: "Just now",
        timestamp: fallbackNow,
        source: "Fallback",
      },
    ];

    return NextResponse.json({ news: fallbackNews, source: "fallback" });
  }
}
