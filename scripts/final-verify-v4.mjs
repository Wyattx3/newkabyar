/**
 * Final V4 - Deterministic interjection injection
 * Should give consistent (non-random) results
 */
const SAPLING_KEY = process.env.SAPLING_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = "moonshotai/kimi-k2-instruct-0905";

async function checkAI(text) {
  const res = await fetch("https://api.sapling.ai/api/v1/aidetect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: SAPLING_KEY, text, sent_scores: true }),
  });
  if (!res.ok) throw new Error(`Sapling: ${res.status}`);
  return await res.json();
}

async function callGroq(system, user, temp = 0.4) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: temp, max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`Groq: ${res.status}`);
  return (await res.json()).choices[0]?.message?.content || "";
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(s => s.length > 5) || [text];
}
function wc(t) { return t.split(/\s+/).filter(w => w.trim()).length; }

const INTERJECTIONS = [
  "Think about it.", "Pretty wild, right?", "Seriously.",
  "And here's the thing.", "No joke.", "For real.",
  "That's kinda huge.", "Wild, right?", "Makes you think.",
  "Not gonna lie.", "It's a lot.", "Crazy, right?",
  "Big deal.", "True story.", "You'd think, right?",
  "Hard to ignore.", "Kinda scary, honestly.",
];

function selectInterjection(text, index) {
  const seed = text.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  return INTERJECTIONS[(seed + index * 7) % INTERJECTIONS.length];
}

const SYSTEM = `You are a phrase-by-phrase text humanizer. Given a sentence, split it into chunks and provide a casual, human-sounding version of each chunk.

CRITICAL RULES:
1. Cover the ENTIRE sentence - every word must be in a chunk
2. Break into 3-6 meaningful chunks
3. Keep exact same meaning
4. Casual replacements: contractions, simple words, talking style
5. AVOID AI patterns: "one of the most", "cannot be overstated", "has emerged"
6. Return ONLY JSON array: [{"chunk":"original","casual":"replacement"}]`;

async function mapSentence(sentence) {
  try {
    const result = await callGroq(SYSTEM, `Map:\n${sentence}`, 0.4);
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch { return null; }
}

function postProcess(text) {
  let r = text;
  r = r.replace(/\bdo not\b/gi, "don't"); r = r.replace(/\bdoes not\b/gi, "doesn't");
  r = r.replace(/\bcannot\b/gi, "can't"); r = r.replace(/\bwill not\b/gi, "won't");
  r = r.replace(/\bis not\b/gi, "isn't"); r = r.replace(/\bare not\b/gi, "aren't");
  r = r.replace(/\bit is\b/gi, "it's"); r = r.replace(/\byou are\b/gi, "you're");
  r = r.replace(/\bwe are\b/gi, "we're"); r = r.replace(/\bthey are\b/gi, "they're");
  r = r.replace(/\bfurthermore,?\s*/gi, "Also, ");
  r = r.replace(/\bmoreover,?\s*/gi, "Plus, ");
  r = r.replace(/\butilize\b/gi, "use"); r = r.replace(/\bfacilitate\b/gi, "help");
  r = r.replace(/\s+/g, " ").trim();
  r = r.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  r = r.charAt(0).toUpperCase() + r.slice(1);
  return r;
}

async function humanize(text) {
  const sentences = splitSentences(text);
  const results = [];
  for (let i = 0; i < sentences.length; i++) {
    const mapping = await mapSentence(sentences[i]);
    if (mapping && mapping.length > 0) {
      let r = mapping.map(m => m.casual).join(" ");
      if (!/[.!?]$/.test(r)) r += ".";
      results.push(r);
    } else {
      results.push(sentences[i]);
    }
    // Deterministic interjection every 2 sentences
    if (sentences.length >= 3 && i < sentences.length - 1 && i % 2 === 1) {
      results.push(selectInterjection(text, i));
    }
    await new Promise(r => setTimeout(r, 200));
  }
  let final = postProcess(results.join(" "));
  const totalWC = wc(text);
  if (wc(final) > totalWC * 1.25) {
    final = final.split(/\s+/).slice(0, Math.ceil(totalWC * 1.15)).join(" ");
    if (!/[.!?]$/.test(final)) final += ".";
    final = postProcess(final);
  }
  return final;
}

const TEXTS = [
  { name: "Renewable energy", text: `The importance of renewable energy cannot be overstated in the context of global sustainability efforts. Solar and wind power have emerged as viable alternatives to fossil fuels, offering clean and abundant sources of energy. Technological innovations have significantly reduced the cost of renewable energy production, making it increasingly competitive with traditional energy sources. Furthermore, the transition to renewable energy creates economic opportunities through job creation in the green technology sector. Governments worldwide are implementing policies to accelerate this transition, recognizing the urgent need to address climate change and reduce carbon emissions.` },
  { name: "AI essay", text: `Artificial intelligence represents a transformative technology that has fundamentally reshaped numerous aspects of modern society. From healthcare diagnostics to autonomous vehicles, AI systems are increasingly integrated into critical applications that affect daily life. The development of large language models has demonstrated remarkable capabilities in natural language understanding and generation, enabling new forms of human-computer interaction. However, these advancements also raise significant ethical concerns, including issues of bias, transparency, and accountability. As AI continues to evolve, it is imperative that researchers, policymakers, and the public collaborate to establish robust governance frameworks that ensure the responsible development and deployment of these powerful technologies.` },
  { name: "Social media", text: `Social media platforms have significantly impacted the way people communicate and share information. While these platforms offer unprecedented connectivity, they also present challenges related to misinformation, mental health, and privacy concerns.` },
  { name: "Mental health", text: `Mental health awareness has gained significant traction in recent years, reflecting a growing understanding of the importance of psychological well-being. Research has consistently demonstrated that mental health is intricately linked to physical health outcomes, with conditions such as depression and anxiety having profound effects on overall quality of life.` },
];

async function main() {
  console.log("=".repeat(60));
  console.log("FINAL V4 - Deterministic interjection injection");
  console.log("=".repeat(60));
  let total = 0, count = 0;
  for (const test of TEXTS) {
    console.log(`\n📝 ${test.name} (${wc(test.text)}w)`);
    const humanized = await humanize(test.text);
    await new Promise(r => setTimeout(r, 2000));
    const det = await checkAI(humanized);
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    const newWC = wc(humanized);
    console.log(`  ${e} ${(det.score * 100).toFixed(1)}% AI | ${newWC}w (±${Math.abs(newWC - wc(test.text))})`);
    console.log(`  "${humanized.substring(0, 150)}..."`);
    total += det.score; count++;
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log(`\n${"=".repeat(60)}`);
  console.log(`AVERAGE: ${(total / count * 100).toFixed(1)}% AI`);
}

main().catch(console.error);
