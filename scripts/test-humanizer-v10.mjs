/**
 * Humanizer V10 - Systematic phrase-by-phrase mapping
 * 
 * KEY INSIGHT: v6 scored 0.0% by doing phrase-level replacement while 
 * keeping the ORIGINAL sentence structure. v9 scored 100% because 
 * AI-generated fragments still have document-level AI fingerprint.
 * 
 * STRATEGY: For each sentence, split into CHUNKS (phrases), 
 * get casual replacement for each chunk, reassemble in SAME structure.
 * 
 * The STRUCTURE comes from the original text (human-like document pattern),
 * but the WORDS come from casual replacements (avoiding AI vocabulary).
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

async function callGroq(system, user, temp = 0.3) {
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

// ============================================================
// Core: Get complete phrase-by-phrase mapping for a sentence
// ============================================================
async function mapSentence(sentence) {
  const system = `You are a phrase-by-phrase text mapper. Given a sentence, break it into meaningful chunks and provide a casual replacement for EACH chunk.

CRITICAL RULES:
- Break into 3-6 chunks covering the ENTIRE sentence
- EVERY word must be in a chunk (complete coverage)
- Each replacement must be casual, use contractions, simple words
- Keep the SAME structure/order
- Keep SAME meaning
- Return JSON array of [{"chunk":"original phrase","casual":"casual version"}]

Example:
Input: "The implementation of sustainable practices demonstrates significant environmental benefits."
Output: [
  {"chunk":"The implementation of","casual":"Using"},
  {"chunk":"sustainable practices","casual":"green methods"},
  {"chunk":"demonstrates","casual":"clearly shows"},
  {"chunk":"significant environmental benefits","casual":"real benefits for the planet"}
]

Another example:
Input: "Research has consistently demonstrated that mental health is intricately linked to physical health outcomes."
Output: [
  {"chunk":"Research has consistently demonstrated","casual":"Studies keep showing"},
  {"chunk":"that mental health","casual":"that how you feel mentally"},
  {"chunk":"is intricately linked to","casual":"is super connected to"},
  {"chunk":"physical health outcomes","casual":"your physical health"}
]

Return ONLY the JSON array. Cover the ENTIRE sentence.`;

  try {
    const result = await callGroq(system, `Map this sentence:\n${sentence}`, 0.3);
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

// Reassemble sentence from chunk mappings
function reassemble(mapping) {
  return mapping.map(m => m.casual).join(" ");
}

// Apply contractions
function applyContractions(text) {
  let r = text;
  r = r.replace(/\bdo not\b/gi, "don't"); r = r.replace(/\bdoes not\b/gi, "doesn't");
  r = r.replace(/\bcannot\b/gi, "can't"); r = r.replace(/\bwill not\b/gi, "won't");
  r = r.replace(/\bis not\b/gi, "isn't"); r = r.replace(/\bare not\b/gi, "aren't");
  r = r.replace(/\bit is\b/gi, "it's"); r = r.replace(/\bthat is\b/gi, "that's");
  r = r.replace(/\bthere is\b/gi, "there's"); r = r.replace(/\byou are\b/gi, "you're");
  r = r.replace(/\bthey are\b/gi, "they're"); r = r.replace(/\bwe are\b/gi, "we're");
  return r;
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(s => s.length > 5) || [text];
}

// ============================================================
// FULL PIPELINE
// ============================================================
async function humanize(text) {
  const sentences = splitSentences(text);
  const results = [];
  
  for (const sent of sentences) {
    const mapping = await mapSentence(sent);
    if (mapping && mapping.length > 0) {
      let reassembled = reassemble(mapping);
      // Ensure proper ending
      if (!/[.!?]$/.test(reassembled)) reassembled += ".";
      results.push(reassembled);
    } else {
      results.push(sent); // Fallback to original
    }
    await new Promise(r => setTimeout(r, 300));
  }
  
  let final = results.join(" ");
  final = applyContractions(final);
  
  // Fix capitalization
  final = final.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  final = final.charAt(0).toUpperCase() + final.slice(1);
  final = final.replace(/\s+/g, " ").trim();
  
  return final;
}

// ============================================================
// TESTS
// ============================================================
const TEXTS = [
  {
    name: "Mental Health",
    text: `Mental health awareness has gained significant traction in recent years, reflecting a growing understanding of the importance of psychological well-being. Research has consistently demonstrated that mental health is intricately linked to physical health outcomes, with conditions such as depression and anxiety having profound effects on overall quality of life. The stigma surrounding mental health issues has begun to diminish, largely due to advocacy efforts and increased public discourse. However, significant barriers to accessing mental health services persist, particularly for marginalized communities. It is imperative that healthcare systems integrate mental health support into primary care settings and that employers create supportive environments that prioritize employee well-being.`
  },
  {
    name: "Climate",
    text: `Climate change represents one of the most pressing challenges facing humanity in the twenty-first century. The scientific consensus is clear: global temperatures are rising due to the increased concentration of greenhouse gases in the atmosphere, primarily from the burning of fossil fuels and deforestation. This warming trend has far-reaching consequences, including rising sea levels, more frequent and severe weather events, and disruptions to ecosystems worldwide. The impacts of climate change are not distributed equally, with developing nations and vulnerable communities bearing a disproportionate burden despite contributing the least to the problem.`
  },
  {
    name: "Technology",
    text: `The rapid advancement of artificial intelligence has revolutionized numerous sectors, from healthcare to finance. Machine learning algorithms are increasingly capable of performing complex tasks that were previously exclusive to human experts. This technological transformation has raised important questions about the future of employment and the ethical implications of automated decision-making. Organizations must carefully navigate these challenges while embracing the significant opportunities that AI presents for innovation and growth.`
  },
  {
    name: "Education",
    text: `The integration of technology in education has fundamentally transformed the learning experience for students and educators alike. Digital tools and platforms have created unprecedented opportunities for personalized learning, enabling students to progress at their own pace and access resources tailored to their individual needs. Virtual classrooms and online learning management systems have expanded access to quality education beyond geographical limitations, allowing students in remote areas to connect with expert instructors worldwide.`
  },
];

async function main() {
  console.log("=".repeat(60));
  console.log("HUMANIZER V10 - Phrase-by-phrase mapping");
  console.log("Preserves original structure, replaces vocabulary");
  console.log("=".repeat(60));

  for (const sample of TEXTS) {
    const wc = sample.text.split(/\s+/).length;
    console.log(`\n📝 ${sample.name} (${wc} words)`);

    const humanized = await humanize(sample.text);
    const newWC = humanized.split(/\s+/).length;

    await new Promise(r => setTimeout(r, 2000));
    const det = await checkAI(humanized);
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} AI: ${(det.score * 100).toFixed(1)}% | ${newWC}w (±${Math.abs(newWC - wc)})`);
    
    if (det.sentence_scores) {
      const passed = det.sentence_scores.filter(s => s.score <= 0.3).length;
      console.log(`  Sentences: ${passed}/${det.sentence_scores.length} human`);
      for (const ss of det.sentence_scores.filter(s => s.score > 0.3)) {
        console.log(`    ❌ ${(ss.score * 100).toFixed(0)}%: "${ss.sentence.substring(0, 70)}"`);
      }
    }
    
    console.log(`\n  OUTPUT: "${humanized}"`);
    console.log();

    await new Promise(r => setTimeout(r, 1500));
  }
}

main().catch(console.error);
