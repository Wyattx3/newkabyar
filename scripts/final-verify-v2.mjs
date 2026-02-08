/**
 * Final Verification V2 - Test the actual humanization logic offline
 * Replicates the same approach used in route.ts
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

IMPORTANT - AVOID these AI patterns in replacements:
- "X is one of the biggest/most important..." → use a direct unique opening
- "Scientists agree/consensus is clear" → different framing
- "It is important/essential/imperative" → just say what needs to happen
- "X has become increasingly" → be more specific

TONE: Natural and conversational, like explaining to a smart friend.

Return ONLY the JSON array.`;

async function mapSentence(sentence) {
  try {
    const result = await callGroq(SYSTEM, `Map this sentence:\n${sentence}`, 0.4);
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
  r = r.replace(/\butilize\b/gi, "use"); r = r.replace(/\bfacilitate\b/gi, "help");
  r = r.replace(/\s+/g, " ").trim();
  r = r.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  r = r.charAt(0).toUpperCase() + r.slice(1);
  return r;
}

async function humanize(text) {
  const sentences = splitSentences(text);
  const results = [];
  for (const sent of sentences) {
    const mapping = await mapSentence(sent);
    if (mapping && mapping.length > 0) {
      let r = mapping.map(m => m.casual).join(" ");
      if (!/[.!?]$/.test(r)) r += ".";
      results.push(r);
    } else {
      results.push(sent);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  let final = postProcess(results.join(" "));
  const totalWC = wc(text);
  const finalWC = wc(final);
  if (finalWC > totalWC * 1.2) {
    final = final.split(/\s+/).slice(0, Math.ceil(totalWC * 1.1)).join(" ");
    if (!/[.!?]$/.test(final)) final += ".";
    final = postProcess(final);
  }
  return final;
}

const TEXTS = [
  {
    name: "Generic AI essay",
    text: `Artificial intelligence represents a transformative technology that has fundamentally reshaped numerous aspects of modern society. From healthcare diagnostics to autonomous vehicles, AI systems are increasingly integrated into critical applications that affect daily life. The development of large language models has demonstrated remarkable capabilities in natural language understanding and generation, enabling new forms of human-computer interaction. However, these advancements also raise significant ethical concerns, including issues of bias, transparency, and accountability. As AI continues to evolve, it is imperative that researchers, policymakers, and the public collaborate to establish robust governance frameworks that ensure the responsible development and deployment of these powerful technologies.`
  },
  {
    name: "ChatGPT renewable energy",
    text: `The importance of renewable energy cannot be overstated in the context of global sustainability efforts. Solar and wind power have emerged as viable alternatives to fossil fuels, offering clean and abundant sources of energy. Technological innovations have significantly reduced the cost of renewable energy production, making it increasingly competitive with traditional energy sources. Furthermore, the transition to renewable energy creates economic opportunities through job creation in the green technology sector. Governments worldwide are implementing policies to accelerate this transition, recognizing the urgent need to address climate change and reduce carbon emissions.`
  },
  {
    name: "Short AI paragraph",
    text: `Social media platforms have significantly impacted the way people communicate and share information. While these platforms offer unprecedented connectivity, they also present challenges related to misinformation, mental health, and privacy concerns.`
  },
];

async function main() {
  console.log("=".repeat(60));
  console.log("FINAL VERIFICATION - Phrase-mapping v10 on unseen texts");
  console.log("=".repeat(60));

  for (const test of TEXTS) {
    const origWC = wc(test.text);
    console.log(`\n📝 ${test.name} (${origWC} words)`);
    
    const origDet = await checkAI(test.text);
    console.log(`  Original: ${(origDet.score * 100).toFixed(1)}% AI`);
    
    await new Promise(r => setTimeout(r, 1000));
    
    const humanized = await humanize(test.text);
    const newWC = wc(humanized);
    
    await new Promise(r => setTimeout(r, 2000));
    const newDet = await checkAI(humanized);
    
    const e = newDet.score <= 0.2 ? "✅ PASS" : newDet.score <= 0.4 ? "🟡 OK" : "❌ FAIL";
    console.log(`  ${e} Humanized: ${(newDet.score * 100).toFixed(1)}% AI | ${newWC}w (±${Math.abs(newWC - origWC)})`);
    
    if (newDet.sentence_scores) {
      const passed = newDet.sentence_scores.filter(s => s.score <= 0.3).length;
      console.log(`  Sentences: ${passed}/${newDet.sentence_scores.length} human`);
    }
    
    console.log(`\n  "${humanized}"\n`);
    
    await new Promise(r => setTimeout(r, 1500));
  }
}

main().catch(console.error);
