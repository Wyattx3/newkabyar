/**
 * V11 - Fix Climate text specifically
 * 
 * PROBLEM: Climate sentences like "Global warming is one of the biggest problems" 
 * and "Scientists all agree" trigger AI detection because these assertion patterns 
 * are extremely common in AI-generated text about climate.
 * 
 * FIX: Tell the AI to avoid standard AI assertion patterns,
 * use more personal/opinion-based phrasing, and be less formulaic.
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

// IMPROVED mapping prompt
const SYSTEM_PROMPT = `You are a phrase-by-phrase text humanizer. Given a sentence, split it into chunks and provide a casual, human-sounding version of each chunk.

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

IMPORTANT - AVOID these AI assertion patterns in replacements:
- "X is one of the biggest/most important..." → use a more direct/unique opening
- "Scientists agree..." → use a different framing
- "It is important/essential/imperative..." → just say what needs to happen
- "X has become increasingly..." → be more specific

Examples:
Input: "Climate change represents one of the most pressing challenges facing humanity."
Output: [
  {"chunk":"Climate change represents","casual":"Look, climate change is"},
  {"chunk":"one of the most pressing challenges","casual":"a seriously massive problem"},
  {"chunk":"facing humanity","casual":"for all of us"}
]

Input: "The scientific consensus is clear: global temperatures are rising."
Output: [
  {"chunk":"The scientific consensus is clear","casual":"Pretty much every scientist says the same thing"},
  {"chunk":"global temperatures are rising","casual":"- the earth's getting hotter"}
]

Return ONLY the JSON array.`;

async function mapSentence(sentence) {
  try {
    const result = await callGroq(SYSTEM_PROMPT, `Map this sentence:\n${sentence}`, 0.4);
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function reassemble(mapping) {
  return mapping.map(m => m.casual).join(" ");
}

function cleanup(text) {
  let r = text;
  r = r.replace(/\bdo not\b/gi, "don't"); r = r.replace(/\bdoes not\b/gi, "doesn't");
  r = r.replace(/\bcannot\b/gi, "can't"); r = r.replace(/\bwill not\b/gi, "won't");
  r = r.replace(/\bis not\b/gi, "isn't"); r = r.replace(/\bare not\b/gi, "aren't");
  r = r.replace(/\bit is\b/gi, "it's"); r = r.replace(/\bthat is\b/gi, "that's");
  r = r.replace(/\bthere is\b/gi, "there's"); r = r.replace(/\byou are\b/gi, "you're");
  r = r.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  r = r.charAt(0).toUpperCase() + r.slice(1);
  r = r.replace(/\s+/g, " ").trim();
  return r;
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(s => s.length > 5) || [text];
}

async function humanize(text) {
  const sentences = splitSentences(text);
  const results = [];
  
  for (const sent of sentences) {
    const mapping = await mapSentence(sent);
    if (mapping && mapping.length > 0) {
      let r = reassemble(mapping);
      if (!/[.!?]$/.test(r)) r += ".";
      results.push(r);
    } else {
      results.push(sent);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  
  return cleanup(results.join(" "));
}

// TEST all 4 texts with improved prompt
const TEXTS = [
  {
    name: "Climate",
    text: `Climate change represents one of the most pressing challenges facing humanity in the twenty-first century. The scientific consensus is clear: global temperatures are rising due to the increased concentration of greenhouse gases in the atmosphere, primarily from the burning of fossil fuels and deforestation. This warming trend has far-reaching consequences, including rising sea levels, more frequent and severe weather events, and disruptions to ecosystems worldwide. The impacts of climate change are not distributed equally, with developing nations and vulnerable communities bearing a disproportionate burden despite contributing the least to the problem.`
  },
  {
    name: "Mental Health",
    text: `Mental health awareness has gained significant traction in recent years, reflecting a growing understanding of the importance of psychological well-being. Research has consistently demonstrated that mental health is intricately linked to physical health outcomes, with conditions such as depression and anxiety having profound effects on overall quality of life. The stigma surrounding mental health issues has begun to diminish, largely due to advocacy efforts and increased public discourse. However, significant barriers to accessing mental health services persist, particularly for marginalized communities. It is imperative that healthcare systems integrate mental health support into primary care settings and that employers create supportive environments that prioritize employee well-being.`
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
  console.log("HUMANIZER V11 - Improved phrase mapping prompt");
  console.log("=".repeat(60));

  let totalScore = 0;
  let count = 0;

  for (const sample of TEXTS) {
    const wc = sample.text.split(/\s+/).length;
    console.log(`\n📝 ${sample.name} (${wc} words)`);

    const humanized = await humanize(sample.text);
    const newWC = humanized.split(/\s+/).length;

    await new Promise(r => setTimeout(r, 2000));
    const det = await checkAI(humanized);
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} AI: ${(det.score * 100).toFixed(1)}% | ${newWC}w (±${Math.abs(newWC - wc)})`);
    totalScore += det.score;
    count++;
    
    if (det.sentence_scores) {
      const passed = det.sentence_scores.filter(s => s.score <= 0.3).length;
      console.log(`  Sentences: ${passed}/${det.sentence_scores.length} human`);
      for (const ss of det.sentence_scores.filter(s => s.score > 0.3)) {
        console.log(`    ❌ ${(ss.score * 100).toFixed(0)}%: "${ss.sentence.substring(0, 70)}"`);
      }
    }
    
    console.log(`  OUTPUT: "${humanized}"`);

    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`AVERAGE AI SCORE: ${(totalScore / count * 100).toFixed(1)}%`);
  console.log("=".repeat(60));
}

main().catch(console.error);
