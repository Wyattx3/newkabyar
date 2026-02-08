/**
 * Humanizer V9 - Phrase replacement + Structural fragmentation
 * 
 * KEY INSIGHT from v6 control test:
 * Sentences that pass Sapling detection share these traits:
 * - Very short (3-8 words)
 * - Questions or fragments
 * - Personal interjections ("I mean", "like")
 * - Slang/informal phrasing
 * - No formal assertions
 * 
 * Sentences that FAIL even when human-written:
 * - Value judgments ("which is great", "we really need to")
 * - Assertions > 12 words
 * - Formal structure even with casual words
 * 
 * STRATEGY: Phrase replacement + break ALL sentences into short fragments
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
      temperature: temp, top_p: 0.9, max_tokens: 8192,
    }),
  });
  if (!res.ok) throw new Error(`Groq: ${res.status}`);
  return (await res.json()).choices[0]?.message?.content || "";
}

// ============================================================
// STEP 1: Built-in phrase replacements
// ============================================================
const BUILTINS = [
  [/\bFurthermore,?\s*/gi, "Also, "], [/\bMoreover,?\s*/gi, "Plus, "],
  [/\bAdditionally,?\s*/gi, "On top of that, "], [/\bHowever,?\s*/gi, "But "],
  [/\bNevertheless,?\s*/gi, "Still, "], [/\bConsequently,?\s*/gi, "So "],
  [/\butilize\b/gi, "use"], [/\butilizing\b/gi, "using"],
  [/\bfacilitate\b/gi, "help"], [/\bdemonstrate\b/gi, "show"],
  [/\bdemonstrated\b/gi, "shown"], [/\benhance\b/gi, "boost"],
  [/\bimplement\b/gi, "put in place"], [/\bleverage\b/gi, "use"],
  [/\bsignificant\b/gi, "big"], [/\bsignificantly\b/gi, "a lot"],
  [/\bsubstantial\b/gi, "big"], [/\bnumerous\b/gi, "tons of"],
  [/\bfundamentally\b/gi, "totally"], [/\bimperative\b/gi, "critical"],
  [/\bunprecedented\b/gi, "wild"], [/\bprofound\b/gi, "huge"],
  [/\bintricately\b/gi, "closely"], [/\bdisproportionate\b/gi, "unfair"],
  [/\bcomprehensive\b/gi, "full"], [/\bparamount\b/gi, "super important"],
  [/\bin recent years\b/gi, "lately"], [/\bin today's world\b/gi, "these days"],
  [/\bdo not\b/gi, "don't"], [/\bdoes not\b/gi, "doesn't"],
  [/\bcannot\b/gi, "can't"], [/\bwill not\b/gi, "won't"],
  [/\bwould not\b/gi, "wouldn't"], [/\bis not\b/gi, "isn't"],
  [/\bare not\b/gi, "aren't"], [/\bit is\b/gi, "it's"],
  [/\bthat is\b/gi, "that's"], [/\bthere is\b/gi, "there's"],
];

// ============================================================
// STEP 2: AI sentence-to-fragment conversion
// This is the KEY innovation: convert each sentence to SHORT FRAGMENTS
// ============================================================
async function sentenceToFragments(sentence) {
  const system = `Convert this formal sentence into 2-4 SHORT casual fragments. Each fragment should be 3-10 words max.

Rules:
- Break the idea into small punchy pieces
- Use contractions everywhere
- Add personality: "honestly", "like", "right?", "kinda", "pretty much"
- Some fragments can be questions
- No formal words
- Keep the SAME meaning

Examples:
Input: "The rapid advancement of technology has significantly impacted various industries."
Output: "Tech's moving crazy fast. It's hit pretty much every industry. Like, everything's changing."

Input: "Research has demonstrated that regular exercise yields substantial health benefits."  
Output: "Studies show exercise is good for you. Shocker, right? But seriously, it helps a ton."

Input: "However, significant challenges remain in addressing climate change effectively."
Output: "But here's the thing. Climate change? Still a massive problem. We're not fixing it fast enough."

Return ONLY the fragments as one paragraph. No quotes, no labels.`;

  try {
    const result = await callGroq(system, sentence, 0.5);
    return result.replace(/^["']|["']$/g, "").trim();
  } catch {
    return sentence; // fallback to original
  }
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(s => s.length > 5) || [text];
}

// ============================================================
// FULL PIPELINE
// ============================================================
async function humanize(text) {
  // Phase 1: Apply built-in replacements
  let processed = text;
  for (const [p, r] of BUILTINS) processed = processed.replace(p, r);
  
  // Phase 2: Split into sentences and convert each to fragments
  const sentences = splitSentences(processed);
  const fragments = [];
  
  for (const sent of sentences) {
    const words = sent.split(/\s+/).length;
    if (words > 10) {
      // Long sentence: convert to fragments
      const frag = await sentenceToFragments(sent);
      fragments.push(frag);
    } else {
      // Short sentence: keep as is (already human-like)
      fragments.push(sent);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  
  let result = fragments.join(" ");
  
  // Phase 3: Final cleanup
  result = result.replace(/\s+/g, " ").trim();
  result = result.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  if (result.length > 0) result = result.charAt(0).toUpperCase() + result.slice(1);
  
  return result;
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
  console.log("HUMANIZER V9 - Phrase replacement + Fragment conversion");
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
      console.log(`  Sentences: ${passed}/${det.sentence_scores.length} passed`);
    }
    
    console.log(`  "${humanized}"`);
    console.log();

    await new Promise(r => setTimeout(r, 1500));
  }
}

main().catch(console.error);
