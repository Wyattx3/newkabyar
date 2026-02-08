/**
 * Final V3 - Add random interjection injection to break document-level patterns
 * 
 * Even when ALL sentences pass individually, document-level detection 
 * can still flag the text. Adding random short interjections between 
 * sentences may break the document-level statistical pattern.
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

// INTERJECTIONS: Short phrases that break document-level AI patterns
const INTERJECTIONS = [
  "Think about it.", "Pretty wild, right?", "Seriously.", "I mean, come on.",
  "And here's the thing.", "No joke.", "For real.", "That's kinda huge.",
  "Wild, right?", "Makes you think.", "Not gonna lie.", "It's a lot.",
  "Crazy, right?", "Big deal.", "True story.", "You'd think, right?",
  "Hard to ignore.", "And it makes sense.", "Kinda scary, honestly.",
];

const SYSTEM = `You are a phrase-by-phrase text humanizer. Given a sentence, split it into chunks and provide a casual, human-sounding version of each chunk.

CRITICAL RULES:
1. Cover the ENTIRE sentence - every word must be in a chunk
2. Break into 3-6 meaningful chunks  
3. Keep exact same meaning and information
4. Casual replacements must:
   - Use contractions (don't, it's, we're)
   - Use simple everyday words
   - Sound like someone talking, not writing
   - AVOID common AI patterns like "one of the most", "is crucial", "plays a role"
   - AVOID vague openings - be specific and direct
5. Return ONLY a JSON array: [{"chunk":"original","casual":"replacement"}]

AVOID these AI patterns:
- "X is one of the biggest/most important..."
- "Scientists agree..."
- "It is important/essential/imperative..."  
- "cannot be overstated"
- "has emerged as"

Return ONLY the JSON array.`;

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
  r = r.replace(/\bit is\b/gi, "it's"); r = r.replace(/\bthat is\b/gi, "that's");
  r = r.replace(/\bthere is\b/gi, "there's"); r = r.replace(/\byou are\b/gi, "you're");
  r = r.replace(/\bwe are\b/gi, "we're"); r = r.replace(/\bthey are\b/gi, "they're");
  r = r.replace(/\bfurthermore,?\s*/gi, "Also, ");
  r = r.replace(/\bmoreover,?\s*/gi, "Plus, ");
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
    
    // Inject random interjection every 2-3 sentences (30% chance)
    if (i < sentences.length - 1 && Math.random() > 0.6) {
      const interjection = INTERJECTIONS[Math.floor(Math.random() * INTERJECTIONS.length)];
      results.push(interjection);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  let final = postProcess(results.join(" "));
  const totalWC = wc(text);
  const finalWC = wc(final);
  if (finalWC > totalWC * 1.25) {
    final = final.split(/\s+/).slice(0, Math.ceil(totalWC * 1.15)).join(" ");
    if (!/[.!?]$/.test(final)) final += ".";
    final = postProcess(final);
  }
  return final;
}

const TEXTS = [
  {
    name: "ChatGPT renewable energy",
    text: `The importance of renewable energy cannot be overstated in the context of global sustainability efforts. Solar and wind power have emerged as viable alternatives to fossil fuels, offering clean and abundant sources of energy. Technological innovations have significantly reduced the cost of renewable energy production, making it increasingly competitive with traditional energy sources. Furthermore, the transition to renewable energy creates economic opportunities through job creation in the green technology sector. Governments worldwide are implementing policies to accelerate this transition, recognizing the urgent need to address climate change and reduce carbon emissions.`
  },
  {
    name: "Generic AI essay",
    text: `Artificial intelligence represents a transformative technology that has fundamentally reshaped numerous aspects of modern society. From healthcare diagnostics to autonomous vehicles, AI systems are increasingly integrated into critical applications that affect daily life. The development of large language models has demonstrated remarkable capabilities in natural language understanding and generation, enabling new forms of human-computer interaction. However, these advancements also raise significant ethical concerns, including issues of bias, transparency, and accountability. As AI continues to evolve, it is imperative that researchers, policymakers, and the public collaborate to establish robust governance frameworks that ensure the responsible development and deployment of these powerful technologies.`
  },
  {
    name: "Short social media",
    text: `Social media platforms have significantly impacted the way people communicate and share information. While these platforms offer unprecedented connectivity, they also present challenges related to misinformation, mental health, and privacy concerns.`
  },
];

async function main() {
  console.log("=".repeat(60));
  console.log("V3 - Phrase mapping + random interjection injection");
  console.log("=".repeat(60));

  for (const test of TEXTS) {
    console.log(`\n📝 ${test.name} (${wc(test.text)}w)`);
    
    // Run 2 times to test consistency
    for (let run = 0; run < 2; run++) {
      const humanized = await humanize(test.text);
      await new Promise(r => setTimeout(r, 2000));
      const det = await checkAI(humanized);
      const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
      const passed = det.sentence_scores?.filter(s => s.score <= 0.3).length || 0;
      const total = det.sentence_scores?.length || 0;
      console.log(`  Run ${run+1}: ${e} ${(det.score * 100).toFixed(1)}% AI | ${wc(humanized)}w | ${passed}/${total} human`);
      if (run === 0) console.log(`  "${humanized.substring(0, 120)}..."`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

main().catch(console.error);
