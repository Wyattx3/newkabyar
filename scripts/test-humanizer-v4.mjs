/**
 * Humanizer V4 - Chunk-by-chunk rewriting
 * 
 * INSIGHT: Long text fails because AI generates more "AI-like" patterns 
 * over longer output. Short texts pass because there's less room for patterns.
 * 
 * STRATEGY: Split text into 2-3 sentence chunks, rewrite each independently,
 * then reassemble. Each chunk is treated as "short text" where strategy works.
 * 
 * Also test: aggressive code-level mutation AFTER AI rewrite
 */

const SAPLING_KEY = process.env.SAPLING_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = "moonshotai/kimi-k2-instruct-0905";

const TEXTS = [
  {
    name: "Education",
    text: `The integration of technology in education has fundamentally transformed the learning experience for students and educators alike. Digital tools and platforms have created unprecedented opportunities for personalized learning, enabling students to progress at their own pace and access resources tailored to their individual needs. Virtual classrooms and online learning management systems have expanded access to quality education beyond geographical limitations, allowing students in remote areas to connect with expert instructors worldwide. Furthermore, artificial intelligence and adaptive learning algorithms are revolutionizing how educational content is delivered, automatically adjusting difficulty levels and providing targeted feedback to enhance student comprehension.`
  },
  {
    name: "Climate",
    text: `Climate change represents one of the most pressing challenges facing humanity in the twenty-first century. The scientific consensus is clear: global temperatures are rising due to the increased concentration of greenhouse gases in the atmosphere, primarily from the burning of fossil fuels and deforestation. This warming trend has far-reaching consequences, including rising sea levels, more frequent and severe weather events, and disruptions to ecosystems worldwide. The impacts of climate change are not distributed equally, with developing nations and vulnerable communities bearing a disproportionate burden despite contributing the least to the problem.`
  },
  {
    name: "Health",
    text: `Mental health awareness has gained significant traction in recent years, reflecting a growing understanding of the importance of psychological well-being. Research has consistently demonstrated that mental health is intricately linked to physical health outcomes, with conditions such as depression and anxiety having profound effects on overall quality of life. The stigma surrounding mental health issues has begun to diminish, largely due to advocacy efforts and increased public discourse. However, significant barriers to accessing mental health services persist, particularly for marginalized communities. It is imperative that healthcare systems integrate mental health support into primary care settings and that employers create supportive environments that prioritize employee well-being.`
  },
];

async function checkAI(text) {
  const res = await fetch("https://api.sapling.ai/api/v1/aidetect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: SAPLING_KEY, text, sent_scores: true }),
  });
  if (!res.ok) throw new Error(`Sapling: ${res.status}`);
  return await res.json();
}

async function callGroq(system, user, temp = 1.0) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: temp, top_p: 0.9, max_tokens: 8192,
    }),
  });
  if (!res.ok) throw new Error(`Groq: ${res.status} ${await res.text()}`);
  return (await res.json()).choices[0]?.message?.content || "";
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(s => s.length > 5) || [text];
}

// ============================================================
// STRATEGY 1: Chunk-by-chunk rewrite (2 sentences per chunk)
// ============================================================
async function strategy_chunks(text) {
  const sentences = splitSentences(text);
  const chunks = [];
  for (let i = 0; i < sentences.length; i += 2) {
    chunks.push(sentences.slice(i, i + 2).join(" "));
  }

  const prompt = `You rewrite text to sound human. Examples:
AI: "The implementation of sustainable practices demonstrates significant environmental benefits."
Human: "Going green actually works. It's got real benefits for the environment."
AI: "It is essential to consider the implications of technological advancement."
Human: "We really need to think about what all this tech means for us."

Rewrite in HUMAN style. Keep same word count. Return ONLY the text.`;

  const rewritten = [];
  for (const chunk of chunks) {
    const wc = chunk.split(/\s+/).length;
    const result = await callGroq(prompt, `Rewrite (${wc} words):\n${chunk}`, 1.0);
    const cleaned = result.replace(/^(Here'?s?|Below|Sure|Okay|I'?ve?|The rewritten|Here is|Note:).*?[:\n]\s*/i, "").trim();
    rewritten.push(cleaned);
    await new Promise(r => setTimeout(r, 300));
  }

  return rewritten.join(" ").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
}

// ============================================================
// STRATEGY 2: Full rewrite + aggressive code-level mutation
// ============================================================
function aggressiveMutate(text) {
  let r = text;
  
  // Force ALL contractions
  const contractions = [
    [/\bdo not\b/gi, "don't"], [/\bdoes not\b/gi, "doesn't"],
    [/\bdid not\b/gi, "didn't"], [/\bwill not\b/gi, "won't"],
    [/\bwould not\b/gi, "wouldn't"], [/\bcould not\b/gi, "couldn't"],
    [/\bshould not\b/gi, "shouldn't"], [/\bcannot\b/gi, "can't"],
    [/\bcan not\b/gi, "can't"], [/\bis not\b/gi, "isn't"],
    [/\bare not\b/gi, "aren't"], [/\bwas not\b/gi, "wasn't"],
    [/\bwere not\b/gi, "weren't"], [/\bhas not\b/gi, "hasn't"],
    [/\bhave not\b/gi, "haven't"], [/\bhad not\b/gi, "hadn't"],
    [/\bit is\b/gi, "it's"], [/\bthat is\b/gi, "that's"],
    [/\bthere is\b/gi, "there's"], [/\bI am\b/g, "I'm"],
    [/\bI have\b/g, "I've"], [/\bI will\b/g, "I'll"],
    [/\byou are\b/gi, "you're"], [/\bwe are\b/gi, "we're"],
    [/\bthey are\b/gi, "they're"], [/\bwho is\b/gi, "who's"],
    [/\bwhat is\b/gi, "what's"], [/\blet us\b/gi, "let's"],
    [/\bit has\b/gi, "it's"], [/\bhe is\b/gi, "he's"],
    [/\bshe is\b/gi, "she's"],
  ];
  for (const [p, rep] of contractions) r = r.replace(p, rep);

  // Remove AI vocabulary
  const aiWords = [
    [/\bfurthermore,?\s*/gi, "Also, "], [/\bmoreover,?\s*/gi, "Plus, "],
    [/\bnevertheless,?\s*/gi, "Still, "], [/\bconsequently,?\s*/gi, "So, "],
    [/\badditionally,?\s*/gi, "Also, "], [/\bsubsequently,?\s*/gi, "Then, "],
    [/\bnonetheless,?\s*/gi, "But "], [/\bhence,?\s*/gi, "So "],
    [/\bin conclusion,?\s*/gi, ""], [/\bto summarize,?\s*/gi, ""],
    [/\butilize\b/gi, "use"], [/\butilizing\b/gi, "using"],
    [/\bfacilitate\b/gi, "help"], [/\bfacilitating\b/gi, "helping"],
    [/\bdemonstrate\b/gi, "show"], [/\bdemonstrating\b/gi, "showing"],
    [/\bdelve\b/gi, "dig"], [/\bdelving\b/gi, "digging"],
    [/\bcomprehensive\b/gi, "full"], [/\bsignificant\b/gi, "big"],
    [/\bsignificantly\b/gi, "a lot"], [/\bsubstantial\b/gi, "major"],
    [/\bsubstantially\b/gi, "a lot"], [/\bfundamentally\b/gi, "basically"],
    [/\bimperative\b/gi, "important"], [/\bnumerous\b/gi, "many"],
    [/\brequire\b/gi, "need"], [/\bpossess\b/gi, "have"],
    [/\bundertake\b/gi, "do"], [/\benhance\b/gi, "improve"],
    [/\benhancing\b/gi, "improving"], [/\bensure\b/gi, "make sure"],
    [/\bensuring\b/gi, "making sure"],
    [/\bin today's world,?\s*/gi, "These days, "],
    [/\bin this day and age,?\s*/gi, "Now, "],
    [/\bit is important to note that\s*/gi, ""],
    [/\bit is worth noting that\s*/gi, ""],
    [/\bit should be noted that\s*/gi, ""],
    [/\bplays a crucial role\b/gi, "matters a lot"],
    [/\bplays a vital role\b/gi, "is really key"],
    [/\bplays a significant role\b/gi, "matters"],
    [/\bhas gained significant traction\b/gi, "has really taken off"],
    [/\breflecting a growing understanding\b/gi, "as more people realize"],
    [/\brepresents one of the most pressing\b/gi, "is one of the biggest"],
    [/\bunprecedented\b/gi, "never-before-seen"],
    [/\btransformed\b/gi, "changed"],
    [/\bparadigm\b/gi, "way of thinking"],
    [/\bimplications\b/gi, "effects"],
    [/\bdisproportionate\b/gi, "unfair"],
    [/\bintricately\b/gi, "closely"],
    [/\bprofound\b/gi, "deep"],
  ];
  for (const [p, rep] of aiWords) r = r.replace(p, rep);

  // Add burstiness: randomly split long sentences with period
  const sentences = r.match(/[^.!?]+[.!?]+/g) || [r];
  const busted = sentences.map(s => {
    const words = s.trim().split(/\s+/);
    if (words.length > 18 && Math.random() > 0.3) {
      // Split at a natural point (comma, "and", "but", "which")
      const splitPoints = [];
      for (let i = 6; i < words.length - 4; i++) {
        const w = words[i].toLowerCase().replace(/[,;]/g, "");
        if (["and", "but", "which", "while", "although", "because", "since", "where", "when"].includes(w)) {
          splitPoints.push(i);
        }
        if (words[i].endsWith(",")) splitPoints.push(i + 1);
      }
      if (splitPoints.length > 0) {
        const splitAt = splitPoints[Math.floor(Math.random() * splitPoints.length)];
        const first = words.slice(0, splitAt).join(" ").replace(/[,;]\s*$/, "") + ".";
        const second = words.slice(splitAt).join(" ");
        const secondCap = second.charAt(0).toUpperCase() + second.slice(1);
        return first + " " + secondCap;
      }
    }
    return s.trim();
  });

  r = busted.join(" ");

  // Clean up
  r = r.replace(/\s+/g, " ").trim();
  r = r.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  if (r.length > 0) r = r.charAt(0).toUpperCase() + r.slice(1);
  
  return r;
}

async function strategy_fullRewrite_mutate(text) {
  const wc = text.split(/\s+/).length;
  const prompt = `You rewrite text to sound human. Examples:
AI: "The implementation of sustainable practices demonstrates significant environmental benefits."
Human: "Going green actually works. It's got real benefits for the environment."
AI: "It is essential to consider the implications of technological advancement."
Human: "We really need to think about what all this tech means for us."
AI: "Furthermore, research indicates that collaborative approaches yield superior outcomes."
Human: "And honestly? Working together just gets better results."
AI: "The utilization of advanced algorithms facilitates enhanced data processing capabilities."
Human: "Better algorithms make data processing way faster. Pretty cool, actually."
AI: "These developments have led to a paradigm shift in how organizations operate."
Human: "This stuff's changed how companies work. Like, completely."

Rewrite in HUMAN style. Keep around ${wc} words. Return ONLY the text.`;

  let result = await callGroq(prompt, `Rewrite this:\n\n${text}`, 1.0);
  result = result.replace(/^(Here'?s?|Below|Sure|Okay|I'?ve?|The rewritten|Here is|Note:).*?[:\n]\s*/i, "").replace(/\n+/g, " ").trim();
  result = aggressiveMutate(result);
  return result;
}

// ============================================================
// STRATEGY 3: Sentence-by-sentence rewrite with VARIED prompts
// ============================================================
const SENTENCE_PERSONAS = [
  "You're explaining this to a 10-year-old. Simple words only.",
  "You're a blogger who uses short punchy sentences and casual language.",
  "You're a college student writing notes quickly. Informal, contractions everywhere.",
  "You're telling your friend about this over coffee. Very casual.",
  "You're writing a tweet thread. Brief, punchy, personality.",
];

async function strategy_variedSentences(text) {
  const sentences = splitSentences(text);
  const rewritten = [];
  
  for (let i = 0; i < sentences.length; i++) {
    const persona = SENTENCE_PERSONAS[i % SENTENCE_PERSONAS.length];
    const wc = sentences[i].split(/\s+/).length;
    const prompt = `${persona} Rewrite this ONE sentence in your style. Keep same meaning and similar word count (${wc} words). Return ONLY the sentence, nothing else.`;
    
    let result = await callGroq(prompt, sentences[i], 1.0);
    result = result.replace(/^["']|["']$/g, "").trim();
    if (!result.endsWith(".") && !result.endsWith("!") && !result.endsWith("?")) result += ".";
    rewritten.push(result);
    await new Promise(r => setTimeout(r, 200));
  }
  
  let final = rewritten.join(" ");
  final = aggressiveMutate(final);
  return final;
}

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("=".repeat(60));
  console.log("HUMANIZER V4 - Advanced strategies");
  console.log("=".repeat(60));

  for (const sample of TEXTS) {
    const wc = sample.text.split(/\s+/).length;
    console.log(`\n📝 ${sample.name} (${wc} words)`);

    // Strategy 1: Chunk-by-chunk
    try {
      console.log("  Strategy 1: Chunk-by-chunk...");
      const r1 = await strategy_chunks(sample.text);
      await new Promise(r => setTimeout(r, 1500));
      const d1 = await checkAI(r1);
      const e1 = d1.score <= 0.2 ? "✅" : d1.score <= 0.4 ? "🟡" : "❌";
      console.log(`  ${e1} Chunks: ${(d1.score * 100).toFixed(1)}% AI | ${r1.split(/\s+/).length}w`);
    } catch (err) {
      console.log(`  ❌ Chunks ERROR: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 1500));

    // Strategy 2: Full rewrite + aggressive mutation
    try {
      console.log("  Strategy 2: Full rewrite + mutation...");
      const r2 = await strategy_fullRewrite_mutate(sample.text);
      await new Promise(r => setTimeout(r, 1500));
      const d2 = await checkAI(r2);
      const e2 = d2.score <= 0.2 ? "✅" : d2.score <= 0.4 ? "🟡" : "❌";
      console.log(`  ${e2} Mutate: ${(d2.score * 100).toFixed(1)}% AI | ${r2.split(/\s+/).length}w`);
    } catch (err) {
      console.log(`  ❌ Mutate ERROR: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 1500));

    // Strategy 3: Varied sentence personas
    try {
      console.log("  Strategy 3: Varied personas...");
      const r3 = await strategy_variedSentences(sample.text);
      await new Promise(r => setTimeout(r, 1500));
      const d3 = await checkAI(r3);
      const e3 = d3.score <= 0.2 ? "✅" : d3.score <= 0.4 ? "🟡" : "❌";
      console.log(`  ${e3} Varied: ${(d3.score * 100).toFixed(1)}% AI | ${r3.split(/\s+/).length}w`);
    } catch (err) {
      console.log(`  ❌ Varied ERROR: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 1500));
  }
}

main().catch(console.error);
