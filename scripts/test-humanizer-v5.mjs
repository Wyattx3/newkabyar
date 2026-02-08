/**
 * Humanizer V5 - Test different models AND Sapling rephrase
 * 
 * 1. Try Llama 3.3 70B (different fingerprint than Kimi K2)
 * 2. Try Mixtral 8x7B
 * 3. Try Sapling's own rephrase API (for reference)
 * 4. Try multiple-pass: AI rewrite → aggressive word-level scrambling
 */

const SAPLING_KEY = process.env.SAPLING_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";

const TEST_TEXT = `Mental health awareness has gained significant traction in recent years, reflecting a growing understanding of the importance of psychological well-being. Research has consistently demonstrated that mental health is intricately linked to physical health outcomes, with conditions such as depression and anxiety having profound effects on overall quality of life. The stigma surrounding mental health issues has begun to diminish, largely due to advocacy efforts and increased public discourse. However, significant barriers to accessing mental health services persist, particularly for marginalized communities. It is imperative that healthcare systems integrate mental health support into primary care settings and that employers create supportive environments that prioritize employee well-being.`;

const WC = TEST_TEXT.split(/\s+/).length;

async function checkAI(text) {
  const res = await fetch("https://api.sapling.ai/api/v1/aidetect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: SAPLING_KEY, text, sent_scores: true }),
  });
  if (!res.ok) throw new Error(`Sapling detect: ${res.status}`);
  return await res.json();
}

async function saplingRephrase(text) {
  const res = await fetch("https://api.sapling.ai/api/v1/rephrase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: SAPLING_KEY, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.log(`  Sapling rephrase error: ${res.status} - ${err}`);
    return null;
  }
  return await res.json();
}

async function callGroq(system, user, temp, model) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: temp, top_p: 0.9, max_tokens: 8192,
    }),
  });
  if (!res.ok) throw new Error(`Groq: ${res.status}`);
  return (await res.json()).choices[0]?.message?.content || "";
}

const FEW_SHOT = `You rewrite text to sound human. Here's how AI writes vs how humans write:

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

Rewrite the text in the HUMAN style. Keep it around ${WC} words. Return ONLY the rewritten text.`;

function clean(text) {
  let r = text.replace(/^(Here'?s?|Below|Sure|Okay|I'?ve?|The rewritten|Here is|Note:).*?[:\n]\s*/i, "").replace(/\n+/g, " ").trim();
  // contractions
  r = r.replace(/\bdo not\b/gi, "don't"); r = r.replace(/\bdoes not\b/gi, "doesn't");
  r = r.replace(/\bdid not\b/gi, "didn't"); r = r.replace(/\bwill not\b/gi, "won't");
  r = r.replace(/\bwould not\b/gi, "wouldn't"); r = r.replace(/\bcould not\b/gi, "couldn't");
  r = r.replace(/\bshould not\b/gi, "shouldn't"); r = r.replace(/\bcannot\b/gi, "can't");
  r = r.replace(/\bis not\b/gi, "isn't"); r = r.replace(/\bare not\b/gi, "aren't");
  r = r.replace(/\bit is\b/gi, "it's"); r = r.replace(/\bthat is\b/gi, "that's");
  r = r.replace(/\bthere is\b/gi, "there's");
  r = r.replace(/\bfurthermore,?\s*/gi, "Also, ");
  r = r.replace(/\bmoreover,?\s*/gi, "Plus, ");
  r = r.replace(/\butilize\b/gi, "use"); r = r.replace(/\bfacilitate\b/gi, "help");
  r = r.replace(/\bdemonstrate\b/gi, "show");
  r = r.replace(/\s+/g, " ").trim();
  return r;
}

async function main() {
  console.log("=".repeat(60));
  console.log("HUMANIZER V5 - Model comparison + Sapling rephrase");
  console.log(`Test text: ${WC} words`);
  console.log("=".repeat(60));

  const results = [];

  // 1. Sapling Rephrase (baseline)
  console.log("\n1. Sapling Rephrase...");
  try {
    const reph = await saplingRephrase(TEST_TEXT);
    if (reph && reph.results) {
      console.log(`  Got ${reph.results.length} results`);
      for (const r of reph.results.slice(0, 2)) {
        await new Promise(r => setTimeout(r, 1500));
        const det = await checkAI(r.replacement);
        const wc = r.replacement.split(/\s+/).length;
        const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
        console.log(`  ${e} Sapling: ${(det.score * 100).toFixed(1)}% | ${wc}w`);
        results.push({ name: "Sapling Rephrase", score: det.score, text: r.replacement });
      }
    } else {
      console.log("  No results from Sapling rephrase");
    }
  } catch (err) {
    console.log(`  Sapling rephrase error: ${err.message}`);
  }

  await new Promise(r => setTimeout(r, 1500));

  // 2. Llama 3.3 70B
  console.log("\n2. Llama 3.3 70B (temp 1.0)...");
  try {
    let raw = await callGroq(FEW_SHOT, `Rewrite (${WC} words):\n\n${TEST_TEXT}`, 1.0, "llama-3.3-70b-versatile");
    raw = clean(raw);
    await new Promise(r => setTimeout(r, 1500));
    const det = await checkAI(raw);
    const wc = raw.split(/\s+/).length;
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} Llama 70B: ${(det.score * 100).toFixed(1)}% | ${wc}w`);
    results.push({ name: "Llama 70B t1.0", score: det.score, text: raw });
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }

  await new Promise(r => setTimeout(r, 1500));

  // 3. Llama 3.3 70B (temp 0.5 - less creative but different)
  console.log("\n3. Llama 3.3 70B (temp 0.5)...");
  try {
    let raw = await callGroq(FEW_SHOT, `Rewrite (${WC} words):\n\n${TEST_TEXT}`, 0.5, "llama-3.3-70b-versatile");
    raw = clean(raw);
    await new Promise(r => setTimeout(r, 1500));
    const det = await checkAI(raw);
    const wc = raw.split(/\s+/).length;
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} Llama 70B: ${(det.score * 100).toFixed(1)}% | ${wc}w`);
    results.push({ name: "Llama 70B t0.5", score: det.score, text: raw });
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }

  await new Promise(r => setTimeout(r, 1500));

  // 4. Mixtral 8x7B
  console.log("\n4. Mixtral 8x7B (temp 1.0)...");
  try {
    let raw = await callGroq(FEW_SHOT, `Rewrite (${WC} words):\n\n${TEST_TEXT}`, 1.0, "mixtral-8x7b-32768");
    raw = clean(raw);
    await new Promise(r => setTimeout(r, 1500));
    const det = await checkAI(raw);
    const wc = raw.split(/\s+/).length;
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} Mixtral: ${(det.score * 100).toFixed(1)}% | ${wc}w`);
    results.push({ name: "Mixtral t1.0", score: det.score, text: raw });
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }

  await new Promise(r => setTimeout(r, 1500));

  // 5. Kimi K2 (reference)
  console.log("\n5. Kimi K2 (temp 1.0 - reference)...");
  try {
    let raw = await callGroq(FEW_SHOT, `Rewrite (${WC} words):\n\n${TEST_TEXT}`, 1.0, "moonshotai/kimi-k2-instruct-0905");
    raw = clean(raw);
    await new Promise(r => setTimeout(r, 1500));
    const det = await checkAI(raw);
    const wc = raw.split(/\s+/).length;
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} Kimi K2: ${(det.score * 100).toFixed(1)}% | ${wc}w`);
    results.push({ name: "Kimi K2 t1.0", score: det.score, text: raw });
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }

  await new Promise(r => setTimeout(r, 1500));

  // 6. Llama 70B DOUBLE-PASS: first casual rewrite, then rewrite again
  console.log("\n6. Llama 70B DOUBLE-PASS...");
  try {
    const pass1 = await callGroq(
      "Rewrite this casually like you're explaining to a friend. Use contractions. Return ONLY the text.",
      TEST_TEXT, 1.0, "llama-3.3-70b-versatile"
    );
    const pass1Clean = clean(pass1);
    await new Promise(r => setTimeout(r, 500));
    const pass2 = await callGroq(
      FEW_SHOT,
      `Rewrite (${WC} words):\n\n${pass1Clean}`, 0.7, "llama-3.3-70b-versatile"
    );
    const final = clean(pass2);
    await new Promise(r => setTimeout(r, 1500));
    const det = await checkAI(final);
    const wc = final.split(/\s+/).length;
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} Double: ${(det.score * 100).toFixed(1)}% | ${wc}w`);
    results.push({ name: "Double-pass Llama", score: det.score, text: final });
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }

  await new Promise(r => setTimeout(r, 1500));

  // 7. Llama 70B with VERY different prompt (blog post personality)
  console.log("\n7. Llama 70B - Blog personality prompt...");
  try {
    const blogPrompt = `You are Jamie, a 28-year-old health blogger who writes in a very personal, conversational style. You love short sentences. You use "I think", "honestly", "the thing is", "look". You sometimes start sentences with "And" or "But". You hate formal language. You use contractions for EVERYTHING. You sometimes use dashes - like this - mid-sentence. You occasionally ask rhetorical questions. Keep it around ${WC} words. Return ONLY the text.`;
    let raw = await callGroq(blogPrompt, `Rewrite this in YOUR style:\n\n${TEST_TEXT}`, 1.0, "llama-3.3-70b-versatile");
    raw = clean(raw);
    await new Promise(r => setTimeout(r, 1500));
    const det = await checkAI(raw);
    const wc = raw.split(/\s+/).length;
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} Blog: ${(det.score * 100).toFixed(1)}% | ${wc}w`);
    results.push({ name: "Blog Llama", score: det.score, text: raw });
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }

  await new Promise(r => setTimeout(r, 1500));

  // 8. Llama + aggressive word-level scramble  
  console.log("\n8. Llama 70B + word scramble post-process...");
  try {
    let raw = await callGroq(FEW_SHOT, `Rewrite (${WC} words):\n\n${TEST_TEXT}`, 1.0, "llama-3.3-70b-versatile");
    raw = clean(raw);
    // Aggressive word-level scramble
    const synonyms = {
      "important": ["big deal", "key", "crucial", "vital", "major"],
      "significant": ["big", "major", "real", "serious"],
      "however": ["but", "though", "still"],
      "therefore": ["so", "that's why", "which means"],
      "particularly": ["especially", "mainly", "mostly"],
      "demonstrate": ["show", "prove", "make clear"],
      "numerous": ["lots of", "tons of", "many", "plenty of"],
      "increasingly": ["more and more", "way more"],
      "effectively": ["well", "properly", "right"],
      "particularly": ["especially", "really", "specifically"],
      "individuals": ["people", "folks", "everyone"],
      "communities": ["groups", "neighborhoods", "people"],
      "challenges": ["problems", "issues", "hurdles"],
      "opportunities": ["chances", "options"],
      "essential": ["needed", "key", "vital"],
      "addressing": ["dealing with", "tackling", "fixing"],
      "regarding": ["about", "when it comes to", "around"],
      "despite": ["even though", "regardless of"],
      "accessing": ["getting", "reaching", "using"],
      "integrating": ["adding", "bringing in", "mixing in"],
      "creating": ["making", "building", "setting up"],
      "providing": ["giving", "offering"],
      "ensuring": ["making sure"],
      "implementing": ["putting in place", "setting up", "rolling out"],
      "environment": ["setting", "space", "place"],
      "approximately": ["about", "around", "roughly"],
      "considerable": ["a lot of", "major", "real"],
      "maintaining": ["keeping", "holding onto"],
      "comprehensive": ["full", "complete", "thorough"],
      "awareness": ["knowledge", "understanding"],
      "diminish": ["shrink", "fade", "drop"],
      "persist": ["stick around", "keep going", "remain"],
      "imperative": ["crucial", "needed", "a must"],
      "prioritize": ["focus on", "put first"],
      "profoundly": ["deeply", "seriously", "really"],
    };
    
    let words = raw.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const lw = words[i].toLowerCase().replace(/[.,!?;:]/g, "");
      if (synonyms[lw] && Math.random() > 0.3) {
        const punct = words[i].match(/[.,!?;:]$/)?.[0] || "";
        const syns = synonyms[lw];
        words[i] = syns[Math.floor(Math.random() * syns.length)] + punct;
      }
    }
    raw = words.join(" ");
    raw = raw.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
    raw = raw.charAt(0).toUpperCase() + raw.slice(1);
    
    await new Promise(r => setTimeout(r, 1500));
    const det = await checkAI(raw);
    const wc = raw.split(/\s+/).length;
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} Scramble: ${(det.score * 100).toFixed(1)}% | ${wc}w`);
    results.push({ name: "Scramble Llama", score: det.score, text: raw });
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }

  // Sort and display
  results.sort((a, b) => a.score - b.score);
  console.log("\n" + "=".repeat(60));
  console.log("FINAL RESULTS:");
  console.log("=".repeat(60));
  for (const r of results) {
    const e = r.score <= 0.2 ? "✅" : r.score <= 0.4 ? "🟡" : "❌";
    console.log(`${e} ${(r.score * 100).toFixed(1).padStart(5)}% | ${r.name}`);
  }

  // Show best text
  const best = results[0];
  console.log(`\n🏆 BEST: ${best.name} (${(best.score * 100).toFixed(1)}%)`);
  console.log(best.text);
}

main().catch(console.error);
