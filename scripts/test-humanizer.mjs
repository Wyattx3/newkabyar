/**
 * Humanizer Training Script
 * Uses Sapling AI Detector to test different humanization strategies
 * Finds the best approach, then we implement it in the app
 * 
 * Usage: node scripts/test-humanizer.mjs
 */

const SAPLING_KEY = process.env.SAPLING_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = "moonshotai/kimi-k2-instruct-0905";

// Sample AI-generated text to test with
const AI_TEXT = `Artificial intelligence has transformed numerous industries by enabling machines to perform tasks that previously required human intelligence. Machine learning algorithms can analyze vast amounts of data to identify patterns and make predictions with remarkable accuracy. Natural language processing has made it possible for computers to understand and generate human language, leading to applications such as chatbots and translation services. Computer vision technology allows machines to interpret and analyze visual information from the world around them. These advancements have created new opportunities for businesses to improve efficiency and reduce costs. However, the rapid development of AI also raises important ethical considerations regarding privacy, bias, and the future of employment. It is essential that society develops appropriate frameworks to ensure that artificial intelligence is used responsibly and benefits everyone.`;

// ============================================================
// SAPLING AI DETECTION
// ============================================================
async function checkAI(text) {
  const res = await fetch("https://api.sapling.ai/api/v1/aidetect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: SAPLING_KEY, text, sent_scores: true }),
  });
  if (!res.ok) throw new Error(`Sapling error: ${res.status}`);
  const data = await res.json();
  return { score: data.score, sentences: data.sentence_scores };
}

// ============================================================
// GROQ CALL
// ============================================================
async function callGroq(system, user, temp = 1.0) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: temp,
      top_p: 0.9,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  return (await res.json()).choices[0]?.message?.content || "";
}

// ============================================================
// STRATEGY DEFINITIONS
// ============================================================
const STRATEGIES = [
  {
    name: "A: Friend explanation (temp 1.0)",
    system: `You're explaining something to a friend. Rewrite this in your own casual words. Use contractions. Vary sentence length. Don't use: furthermore, moreover, additionally, utilize, demonstrate, significant, comprehensive, essential, crucial. Return ONLY the text.`,
    temp: 1.0,
  },
  {
    name: "B: Friend explanation (temp 1.3)",
    system: `You're explaining something to a friend. Rewrite this in your own casual words. Use contractions. Vary sentence length. Don't use: furthermore, moreover, additionally, utilize, demonstrate, significant, comprehensive, essential, crucial. Return ONLY the text.`,
    temp: 1.3,
  },
  {
    name: "C: Student essay (temp 1.0)",
    system: `You're a college student rewriting notes into an essay. Write naturally, not like AI. Use contractions (don't, it's, can't). Mix short and long sentences. Add occasional "I think" or "basically". No fancy words. Return ONLY the text.`,
    temp: 1.0,
  },
  {
    name: "D: Student essay (temp 1.3)",
    system: `You're a college student rewriting notes into an essay. Write naturally, not like AI. Use contractions (don't, it's, can't). Mix short and long sentences. Add occasional "I think" or "basically". No fancy words. Return ONLY the text.`,
    temp: 1.3,
  },
  {
    name: "E: Storyteller (temp 1.0)",
    system: `Rewrite this like you're telling a story to someone. Be conversational. Use "you know", "like", "basically" sparingly. Short sentences mixed with longer ones. Contractions always. No academic words. Return ONLY the text.`,
    temp: 1.0,
  },
  {
    name: "F: Storyteller (temp 1.5)",
    system: `Rewrite this like you're telling a story to someone. Be conversational. Use "you know", "like", "basically" sparingly. Short sentences mixed with longer ones. Contractions always. No academic words. Return ONLY the text.`,
    temp: 1.5,
  },
  {
    name: "G: Minimum change (temp 1.0)",
    system: `Make MINIMAL changes to this text to make it sound more human. Only change 3-4 words per sentence. Add contractions. Keep same structure. Return ONLY the text.`,
    temp: 1.0,
  },
  {
    name: "H: First person rewrite (temp 1.2)",
    system: `Rewrite this in first person as if you personally know about this topic. Use "I", "we", "you". Be opinionated. Use contractions. Short punchy sentences mixed with explanations. Sound like a real person writing a blog post. Return ONLY the text.`,
    temp: 1.2,
  },
  {
    name: "I: Sentence-by-sentence with examples (temp 1.0)",
    system: `You rewrite text to sound human. Here are examples of AI vs human writing:

AI: "The implementation of sustainable practices demonstrates significant environmental benefits."
Human: "Going green actually works. It's got real benefits for the environment."

AI: "It is essential to consider the implications of technological advancement."  
Human: "We really need to think about what all this tech means for us."

AI: "Furthermore, research indicates that collaborative approaches yield superior outcomes."
Human: "And honestly? Working together just gets better results."

Now rewrite the text below in the HUMAN style shown above. Return ONLY the text.`,
    temp: 1.0,
  },
  {
    name: "J: Few-shot examples (temp 1.3)",
    system: `You rewrite text to sound human. Here are examples of AI vs human writing:

AI: "The implementation of sustainable practices demonstrates significant environmental benefits."
Human: "Going green actually works. It's got real benefits for the environment."

AI: "It is essential to consider the implications of technological advancement."  
Human: "We really need to think about what all this tech means for us."

AI: "Furthermore, research indicates that collaborative approaches yield superior outcomes."
Human: "And honestly? Working together just gets better results."

Now rewrite the text below in the HUMAN style shown above. Return ONLY the text.`,
    temp: 1.3,
  },
];

// ============================================================
// RUN TESTS
// ============================================================
async function main() {
  console.log("=".repeat(60));
  console.log("HUMANIZER TRAINING - Testing strategies with Sapling AI Detector");
  console.log("=".repeat(60));

  // First, check the original AI text
  console.log("\n📝 Original AI text word count:", AI_TEXT.split(/\s+/).length);
  const origScore = await checkAI(AI_TEXT);
  console.log(`🤖 Original AI Score: ${(origScore.score * 100).toFixed(1)}%\n`);

  const results = [];

  for (const strategy of STRATEGIES) {
    try {
      console.log(`Testing: ${strategy.name}...`);
      
      const humanized = await callGroq(
        strategy.system,
        `Rewrite this:\n\n${AI_TEXT}`,
        strategy.temp
      );

      // Clean preamble
      const cleaned = humanized
        .replace(/^(Here'?s?|Below|Sure|Okay|I'?ve?|The rewritten|Here is|Note:).*?[:\n]\s*/i, "")
        .trim();

      // Small delay to avoid rate limit
      await new Promise(r => setTimeout(r, 1000));

      const detection = await checkAI(cleaned);
      const wordCount = cleaned.split(/\s+/).length;

      console.log(`  → AI Score: ${(detection.score * 100).toFixed(1)}% | Words: ${wordCount}`);

      results.push({
        name: strategy.name,
        score: detection.score,
        wordCount,
        text: cleaned.substring(0, 200) + "...",
        fullText: cleaned,
      });

      // Delay between tests
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`  → ERROR: ${err.message}`);
      results.push({ name: strategy.name, score: 1.0, wordCount: 0, text: "ERROR", fullText: "" });
    }
  }

  // Sort by best score
  results.sort((a, b) => a.score - b.score);

  console.log("\n" + "=".repeat(60));
  console.log("RESULTS (sorted by AI detection score - lower is better):");
  console.log("=".repeat(60));

  for (const r of results) {
    const bar = "█".repeat(Math.round(r.score * 30)) + "░".repeat(30 - Math.round(r.score * 30));
    const emoji = r.score <= 0.2 ? "✅" : r.score <= 0.4 ? "🟡" : r.score <= 0.6 ? "🟠" : "❌";
    console.log(`${emoji} ${(r.score * 100).toFixed(1).padStart(5)}% [${bar}] ${r.name} (${r.wordCount}w)`);
  }

  // Show best result
  const best = results[0];
  console.log("\n" + "=".repeat(60));
  console.log(`BEST STRATEGY: ${best.name}`);
  console.log(`AI Score: ${(best.score * 100).toFixed(1)}%`);
  console.log(`Words: ${best.wordCount}`);
  console.log("=".repeat(60));
  console.log("\nFull text:");
  console.log(best.fullText);
}

main().catch(console.error);
