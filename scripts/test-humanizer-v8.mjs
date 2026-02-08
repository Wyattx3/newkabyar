/**
 * Humanizer V8 - Perfected Two-Step Strategy
 * 
 * RESULTS SO FAR:
 * - Education: 0.0% AI ✅
 * - Climate: 3.9% AI ✅  
 * - Mental Health: 98.9% AI ❌ (not enough replacements)
 * 
 * IMPROVEMENTS:
 * 1. More aggressive prompt - find ALL formal/AI phrases, not just obvious ones
 * 2. Process sentence-by-sentence for more thorough replacement
 * 3. Second pass: check which sentences are still AI, get more replacements
 * 4. Add built-in common AI patterns as fallback
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

// Built-in common AI phrase replacements (always applied first)
const BUILTIN_REPLACEMENTS = [
  // Transition words
  [/\bFurthermore,?\s*/gi, "Also, "],
  [/\bMoreover,?\s*/gi, "Plus, "],
  [/\bAdditionally,?\s*/gi, "On top of that, "],
  [/\bNevertheless,?\s*/gi, "Still, "],
  [/\bNonetheless,?\s*/gi, "Even so, "],
  [/\bConsequently,?\s*/gi, "So "],
  [/\bSubsequently,?\s*/gi, "After that, "],
  [/\bHowever,?\s*/gi, "But "],
  [/\bIn conclusion,?\s*/gi, ""],
  [/\bTo summarize,?\s*/gi, ""],
  [/\bIn summary,?\s*/gi, ""],
  // Formal verbs
  [/\butilize\b/gi, "use"], [/\butilizing\b/gi, "using"],
  [/\bfacilitate\b/gi, "help"], [/\bfacilitating\b/gi, "helping"],
  [/\bdemonstrate\b/gi, "show"], [/\bdemonstrating\b/gi, "showing"], [/\bdemonstrated\b/gi, "shown"],
  [/\bdelve\b/gi, "dig"], [/\bdelving\b/gi, "digging"],
  [/\benhance\b/gi, "boost"], [/\benhancing\b/gi, "boosting"],
  [/\bimplement\b/gi, "set up"], [/\bimplementing\b/gi, "setting up"],
  [/\bleverage\b/gi, "use"], [/\bleveraging\b/gi, "using"],
  [/\boptimize\b/gi, "improve"], [/\boptimizing\b/gi, "improving"],
  // Formal adjectives/adverbs
  [/\bsignificant\b/gi, "big"], [/\bsignificantly\b/gi, "a lot"],
  [/\bsubstantial\b/gi, "major"], [/\bsubstantially\b/gi, "a lot"],
  [/\bcomprehensive\b/gi, "full"], [/\bnumerous\b/gi, "lots of"],
  [/\bfundamentally\b/gi, "basically"],
  [/\bimperative\b/gi, "critical"],
  [/\bunprecedented\b/gi, "never-before-seen"],
  [/\bprofound\b/gi, "deep"],  [/\bprofoundly\b/gi, "deeply"],
  [/\bintricately\b/gi, "closely"],
  [/\bdisproportionate\b/gi, "unfair"],
  [/\bmeticulous\b/gi, "careful"],
  [/\bpivotal\b/gi, "key"],
  [/\bparamount\b/gi, "super important"],
  // AI phrases
  [/\bit is important to note that\s*/gi, ""],
  [/\bit is worth noting that\s*/gi, ""],
  [/\bit should be noted that\s*/gi, ""],
  [/\bin today's world,?\s*/gi, "These days, "],
  [/\bin this day and age,?\s*/gi, "Now, "],
  [/\bplays a crucial role\b/gi, "matters a lot"],
  [/\bplays a vital role\b/gi, "is really key"],
  [/\bplays a significant role\b/gi, "matters"],
  [/\bhas gained significant traction\b/gi, "has really taken off"],
  [/\bin recent years\b/gi, "lately"],
  [/\breflecting a growing understanding\b/gi, "as people realize more about"],
  // Contractions
  [/\bdo not\b/gi, "don't"], [/\bdoes not\b/gi, "doesn't"],
  [/\bdid not\b/gi, "didn't"], [/\bwill not\b/gi, "won't"],
  [/\bwould not\b/gi, "wouldn't"], [/\bcould not\b/gi, "couldn't"],
  [/\bshould not\b/gi, "shouldn't"], [/\bcannot\b/gi, "can't"],
  [/\bis not\b/gi, "isn't"], [/\bare not\b/gi, "aren't"],
  [/\bwas not\b/gi, "wasn't"], [/\bwere not\b/gi, "weren't"],
  [/\bhas not\b/gi, "hasn't"], [/\bhave not\b/gi, "haven't"],
  [/\bit is\b/gi, "it's"], [/\bthat is\b/gi, "that's"],
  [/\bthere is\b/gi, "there's"], [/\bI am\b/g, "I'm"],
  [/\byou are\b/gi, "you're"], [/\bwe are\b/gi, "we're"],
  [/\bthey are\b/gi, "they're"], [/\bwho is\b/gi, "who's"],
  [/\bwhat is\b/gi, "what's"], [/\blet us\b/gi, "let's"],
];

function applyBuiltins(text) {
  let r = text;
  for (const [pattern, replacement] of BUILTIN_REPLACEMENTS) {
    r = r.replace(pattern, replacement);
  }
  return r;
}

// IMPROVED: Get phrase replacements per SENTENCE
async function getReplacementsForSentence(sentence) {
  const system = `You are a text humanizer. Given ONE sentence, find EVERY formal or AI-sounding phrase and give a casual replacement.

CRITICAL RULES:
- Find ALL formal phrases, not just obvious ones
- Include phrases like "reflecting a growing", "of the importance of", "the integration of", etc.
- Replacements must be casual, natural, simple
- Keep exact same meaning
- Return JSON array: [{"old":"phrase","new":"replacement"}]
- Find at LEAST 3-5 replacements per sentence
- If a whole clause sounds AI, replace the whole clause

Return ONLY the JSON array.`;

  const result = await callGroq(system, `Find ALL AI-sounding phrases:\n\n${sentence}`, 0.3);
  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyReplacements(text, replacements) {
  let result = text;
  const sorted = [...replacements].sort((a, b) => (b.old?.length || 0) - (a.old?.length || 0));
  for (const { old: o, new: n } of sorted) {
    if (o && n && o.length > 3) {
      result = result.replace(new RegExp(escapeRegex(o), "gi"), n);
    }
  }
  return result;
}

function cleanup(text) {
  let r = text;
  r = r.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  r = r.charAt(0).toUpperCase() + r.slice(1);
  r = r.replace(/\s+/g, " ").trim();
  return r;
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(s => s.length > 5) || [text];
}

// ============================================================
// MAIN PROCESS: sentence-by-sentence replacement
// ============================================================
async function humanize(text) {
  // Step 1: Apply built-in replacements
  let result = applyBuiltins(text);
  
  // Step 2: Get AI replacements for each sentence
  const sentences = splitSentences(result);
  const allReplacements = [];
  
  for (const sent of sentences) {
    const reps = await getReplacementsForSentence(sent);
    allReplacements.push(...reps);
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Step 3: Apply AI-suggested replacements
  result = applyReplacements(result, allReplacements);
  result = cleanup(result);
  
  return { text: result, replacements: allReplacements };
}

// ============================================================
// TEST
// ============================================================
const TEXTS = [
  {
    name: "Mental Health",
    text: `Mental health awareness has gained significant traction in recent years, reflecting a growing understanding of the importance of psychological well-being. Research has consistently demonstrated that mental health is intricately linked to physical health outcomes, with conditions such as depression and anxiety having profound effects on overall quality of life. The stigma surrounding mental health issues has begun to diminish, largely due to advocacy efforts and increased public discourse. However, significant barriers to accessing mental health services persist, particularly for marginalized communities. It is imperative that healthcare systems integrate mental health support into primary care settings and that employers create supportive environments that prioritize employee well-being.`
  },
  {
    name: "Education",
    text: `The integration of technology in education has fundamentally transformed the learning experience for students and educators alike. Digital tools and platforms have created unprecedented opportunities for personalized learning, enabling students to progress at their own pace and access resources tailored to their individual needs. Virtual classrooms and online learning management systems have expanded access to quality education beyond geographical limitations, allowing students in remote areas to connect with expert instructors worldwide. Furthermore, artificial intelligence and adaptive learning algorithms are revolutionizing how educational content is delivered, automatically adjusting difficulty levels and providing targeted feedback to enhance student comprehension.`
  },
  {
    name: "Climate",
    text: `Climate change represents one of the most pressing challenges facing humanity in the twenty-first century. The scientific consensus is clear: global temperatures are rising due to the increased concentration of greenhouse gases in the atmosphere, primarily from the burning of fossil fuels and deforestation. This warming trend has far-reaching consequences, including rising sea levels, more frequent and severe weather events, and disruptions to ecosystems worldwide. The impacts of climate change are not distributed equally, with developing nations and vulnerable communities bearing a disproportionate burden despite contributing the least to the problem.`
  },
  {
    name: "Technology (new test)",
    text: `The rapid advancement of artificial intelligence has revolutionized numerous sectors, from healthcare to finance. Machine learning algorithms are increasingly capable of performing complex tasks that were previously exclusive to human experts. This technological transformation has raised important questions about the future of employment and the ethical implications of automated decision-making. Organizations must carefully navigate these challenges while embracing the significant opportunities that AI presents for innovation and growth.`
  },
];

async function main() {
  console.log("=".repeat(60));
  console.log("HUMANIZER V8 - Perfected sentence-by-sentence replacement");
  console.log("=".repeat(60));

  for (const sample of TEXTS) {
    const wc = sample.text.split(/\s+/).length;
    console.log(`\n📝 ${sample.name} (${wc} words)`);

    const { text: humanized, replacements } = await humanize(sample.text);
    const newWC = humanized.split(/\s+/).length;
    
    console.log(`  Applied ${replacements.length} AI replacements + builtins`);
    
    await new Promise(r => setTimeout(r, 2000));
    const det = await checkAI(humanized);
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} AI Score: ${(det.score * 100).toFixed(1)}% | ${newWC}w (±${Math.abs(newWC - wc)})`);
    
    // Check sentence-level
    if (det.sentence_scores) {
      const passed = det.sentence_scores.filter(s => s.score <= 0.3).length;
      const total = det.sentence_scores.length;
      console.log(`  Sentences: ${passed}/${total} passed`);
      
      // Show failed sentences
      for (const ss of det.sentence_scores.filter(s => s.score > 0.3)) {
        console.log(`    ❌ ${(ss.score * 100).toFixed(0)}%: "${ss.sentence.substring(0, 70)}..."`);
      }
    }
    
    console.log(`  Full: "${humanized.substring(0, 150)}..."`);
    
    // If still high, do PASS 2: fix remaining sentences
    if (det.score > 0.3 && det.sentence_scores) {
      console.log("\n  === PASS 2: Fixing remaining AI sentences ===");
      const badSentences = det.sentence_scores.filter(s => s.score > 0.3);
      const moreReps = [];
      
      for (const bad of badSentences) {
        const reps = await getReplacementsForSentence(bad.sentence);
        moreReps.push(...reps);
        await new Promise(r => setTimeout(r, 200));
      }
      
      let pass2 = applyReplacements(humanized, moreReps);
      pass2 = cleanup(pass2);
      
      await new Promise(r => setTimeout(r, 2000));
      const det2 = await checkAI(pass2);
      const e2 = det2.score <= 0.2 ? "✅" : det2.score <= 0.4 ? "🟡" : "❌";
      console.log(`  ${e2} Pass 2 AI Score: ${(det2.score * 100).toFixed(1)}%`);
      console.log(`  Full: "${pass2.substring(0, 150)}..."`);
    }

    await new Promise(r => setTimeout(r, 1500));
  }
}

main().catch(console.error);
