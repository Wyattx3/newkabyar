/**
 * Humanizer V7 - WINNING STRATEGY
 * 
 * DISCOVERY: Pure code-level phrase replacement scored 0.0% AI detection!
 * 
 * STRATEGY: Two-step approach:
 * Step 1: Ask AI to identify AI-sounding phrases and suggest casual replacements (JSON)
 * Step 2: Use CODE to apply replacements to original text (no full AI rewrite)
 * 
 * This way the final text is assembled by CODE, not AI, so it has no AI fingerprint.
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

async function callGroq(system, user, temp = 0.5) {
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

// STEP 1: Get AI to identify formal/AI phrases and suggest casual replacements
async function getReplacements(text) {
  const system = `You are a text editor. Given a text, identify ALL formal, academic, or AI-sounding phrases and suggest casual, natural, human-sounding replacements.

RULES:
- Find phrases of 2-6 words, not single common words
- Replacements should be casual, using contractions and simple words
- Keep the MEANING exactly the same
- Replacement should be similar length (±2 words)
- Return ONLY valid JSON array

Example:
Input: "The implementation of AI has demonstrated significant benefits."
Output: [{"old":"The implementation of","new":"Using"},{"old":"has demonstrated significant benefits","new":"has really helped a lot"}]

Return ONLY the JSON array, nothing else.`;

  const result = await callGroq(system, `Find formal/AI phrases to replace:\n\n${text}`, 0.3);
  
  // Parse JSON from response
  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.log(`  JSON parse error: ${err.message}`);
    console.log(`  Raw: ${result.substring(0, 200)}`);
    return [];
  }
}

// STEP 2: Apply replacements using CODE (not AI)
function applyReplacements(text, replacements) {
  let result = text;
  
  // Sort by length descending to replace longer phrases first
  const sorted = [...replacements].sort((a, b) => b.old.length - a.old.length);
  
  for (const { old: oldPhrase, new: newPhrase } of sorted) {
    if (oldPhrase && newPhrase && oldPhrase.length > 3) {
      // Case-insensitive replacement
      const regex = new RegExp(escapeRegex(oldPhrase), "gi");
      result = result.replace(regex, newPhrase);
    }
  }

  // Also apply standard contractions
  result = result.replace(/\bdo not\b/gi, "don't");
  result = result.replace(/\bdoes not\b/gi, "doesn't");
  result = result.replace(/\bis not\b/gi, "isn't");
  result = result.replace(/\bare not\b/gi, "aren't");
  result = result.replace(/\bcannot\b/gi, "can't");
  result = result.replace(/\bwill not\b/gi, "won't");
  result = result.replace(/\bwould not\b/gi, "wouldn't");
  result = result.replace(/\bit is\b/gi, "it's");
  result = result.replace(/\bthat is\b/gi, "that's");
  result = result.replace(/\bthere is\b/gi, "there's");

  // Fix capitalization
  result = result.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  result = result.charAt(0).toUpperCase() + result.slice(1);
  result = result.replace(/\s+/g, " ").trim();
  
  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================
// TEST TEXTS
// ============================================================
const TEXTS = [
  {
    name: "Mental Health (AI)",
    text: `Mental health awareness has gained significant traction in recent years, reflecting a growing understanding of the importance of psychological well-being. Research has consistently demonstrated that mental health is intricately linked to physical health outcomes, with conditions such as depression and anxiety having profound effects on overall quality of life. The stigma surrounding mental health issues has begun to diminish, largely due to advocacy efforts and increased public discourse. However, significant barriers to accessing mental health services persist, particularly for marginalized communities. It is imperative that healthcare systems integrate mental health support into primary care settings and that employers create supportive environments that prioritize employee well-being.`
  },
  {
    name: "Education (AI)",
    text: `The integration of technology in education has fundamentally transformed the learning experience for students and educators alike. Digital tools and platforms have created unprecedented opportunities for personalized learning, enabling students to progress at their own pace and access resources tailored to their individual needs. Virtual classrooms and online learning management systems have expanded access to quality education beyond geographical limitations, allowing students in remote areas to connect with expert instructors worldwide. Furthermore, artificial intelligence and adaptive learning algorithms are revolutionizing how educational content is delivered, automatically adjusting difficulty levels and providing targeted feedback to enhance student comprehension.`
  },
  {
    name: "Climate (AI)",
    text: `Climate change represents one of the most pressing challenges facing humanity in the twenty-first century. The scientific consensus is clear: global temperatures are rising due to the increased concentration of greenhouse gases in the atmosphere, primarily from the burning of fossil fuels and deforestation. This warming trend has far-reaching consequences, including rising sea levels, more frequent and severe weather events, and disruptions to ecosystems worldwide. The impacts of climate change are not distributed equally, with developing nations and vulnerable communities bearing a disproportionate burden despite contributing the least to the problem.`
  },
];

async function main() {
  console.log("=".repeat(60));
  console.log("HUMANIZER V7 - Two-step: AI identifies → Code replaces");
  console.log("=".repeat(60));

  for (const sample of TEXTS) {
    const wc = sample.text.split(/\s+/).length;
    console.log(`\n📝 ${sample.name} (${wc} words)`);

    // Check original
    const origDet = await checkAI(sample.text);
    console.log(`  Original: ${(origDet.score * 100).toFixed(1)}% AI`);
    
    await new Promise(r => setTimeout(r, 1500));

    // Get replacements from AI
    console.log("  Getting replacements from AI...");
    const replacements = await getReplacements(sample.text);
    console.log(`  Found ${replacements.length} replacements`);
    
    if (replacements.length > 0) {
      // Show a few
      for (const rep of replacements.slice(0, 5)) {
        console.log(`    "${rep.old}" → "${rep.new}"`);
      }
      if (replacements.length > 5) console.log(`    ... and ${replacements.length - 5} more`);
    }

    // Apply replacements
    const humanized = applyReplacements(sample.text, replacements);
    const newWC = humanized.split(/\s+/).length;
    
    await new Promise(r => setTimeout(r, 1500));
    const newDet = await checkAI(humanized);
    const e = newDet.score <= 0.2 ? "✅" : newDet.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} Result: ${(newDet.score * 100).toFixed(1)}% AI | ${newWC}w (±${Math.abs(newWC - wc)})`);
    console.log(`  Text: "${humanized.substring(0, 120)}..."`);

    // If still high, show sentence scores
    if (newDet.score > 0.3 && newDet.sentence_scores) {
      console.log("  Problem sentences:");
      for (const ss of newDet.sentence_scores.filter(s => s.score > 0.3)) {
        console.log(`    ❌ ${(ss.score * 100).toFixed(0)}%: "${ss.sentence.substring(0, 60)}..."`);
      }
    }

    await new Promise(r => setTimeout(r, 1500));
  }
}

main().catch(console.error);
