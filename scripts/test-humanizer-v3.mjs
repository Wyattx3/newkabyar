/**
 * Humanizer Training V3 - Test the winning strategy with MULTIPLE texts
 * Ensure it works consistently, not just with one sample
 */

const SAPLING_KEY = process.env.SAPLING_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = "moonshotai/kimi-k2-instruct-0905";

// Multiple AI-generated test texts
const TEXTS = [
  {
    name: "Tech (short)",
    text: `Artificial intelligence has transformed numerous industries by enabling machines to perform tasks that previously required human intelligence. Machine learning algorithms can analyze vast amounts of data to identify patterns and make predictions with remarkable accuracy. Natural language processing has made it possible for computers to understand and generate human language, leading to applications such as chatbots and translation services.`
  },
  {
    name: "Education (medium)",
    text: `The integration of technology in education has fundamentally transformed the learning experience for students and educators alike. Digital tools and platforms have created unprecedented opportunities for personalized learning, enabling students to progress at their own pace and access resources tailored to their individual needs. Virtual classrooms and online learning management systems have expanded access to quality education beyond geographical limitations, allowing students in remote areas to connect with expert instructors worldwide. Furthermore, artificial intelligence and adaptive learning algorithms are revolutionizing how educational content is delivered, automatically adjusting difficulty levels and providing targeted feedback to enhance student comprehension.`
  },
  {
    name: "Climate (long)",
    text: `Climate change represents one of the most pressing challenges facing humanity in the twenty-first century. The scientific consensus is clear: global temperatures are rising due to the increased concentration of greenhouse gases in the atmosphere, primarily from the burning of fossil fuels and deforestation. This warming trend has far-reaching consequences, including rising sea levels, more frequent and severe weather events, and disruptions to ecosystems worldwide. The impacts of climate change are not distributed equally, with developing nations and vulnerable communities bearing a disproportionate burden despite contributing the least to the problem. Addressing this crisis requires coordinated international action, including transitioning to renewable energy sources, implementing carbon pricing mechanisms, and investing in climate adaptation strategies. While the challenges are significant, there are also reasons for optimism, as technological innovations in clean energy, sustainable agriculture, and carbon capture continue to advance rapidly.`
  },
  {
    name: "Health (ChatGPT style)",
    text: `Mental health awareness has gained significant traction in recent years, reflecting a growing understanding of the importance of psychological well-being. Research has consistently demonstrated that mental health is intricately linked to physical health outcomes, with conditions such as depression and anxiety having profound effects on overall quality of life. The stigma surrounding mental health issues has begun to diminish, largely due to advocacy efforts and increased public discourse. However, significant barriers to accessing mental health services persist, particularly for marginalized communities. It is imperative that healthcare systems integrate mental health support into primary care settings and that employers create supportive environments that prioritize employee well-being.`
  },
];

async function checkAI(text) {
  const res = await fetch("https://api.sapling.ai/api/v1/aidetect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: SAPLING_KEY, text, sent_scores: true }),
  });
  if (!res.ok) throw new Error(`Sapling error: ${res.status}`);
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
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  return (await res.json()).choices[0]?.message?.content || "";
}

function buildPrompt(wordCount) {
  return `You rewrite text to sound human. Here's how AI writes vs how humans write:

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

Rewrite the text in the HUMAN style. Keep it around ${wordCount} words. Return ONLY the rewritten text.`;
}

function postProcess(text) {
  let r = text;
  r = r.replace(/\bdo not\b/gi, "don't"); r = r.replace(/\bdoes not\b/gi, "doesn't");
  r = r.replace(/\bdid not\b/gi, "didn't"); r = r.replace(/\bwill not\b/gi, "won't");
  r = r.replace(/\bwould not\b/gi, "wouldn't"); r = r.replace(/\bcould not\b/gi, "couldn't");
  r = r.replace(/\bshould not\b/gi, "shouldn't"); r = r.replace(/\bcannot\b/gi, "can't");
  r = r.replace(/\bis not\b/gi, "isn't"); r = r.replace(/\bare not\b/gi, "aren't");
  r = r.replace(/\bwas not\b/gi, "wasn't"); r = r.replace(/\bwere not\b/gi, "weren't");
  r = r.replace(/\bhas not\b/gi, "hasn't"); r = r.replace(/\bhave not\b/gi, "haven't");
  r = r.replace(/\bit is\b/gi, "it's"); r = r.replace(/\bthat is\b/gi, "that's");
  r = r.replace(/\bthere is\b/gi, "there's"); r = r.replace(/\bI am\b/g, "I'm");
  r = r.replace(/\byou are\b/gi, "you're"); r = r.replace(/\bwe are\b/gi, "we're");
  r = r.replace(/\bthey are\b/gi, "they're");
  r = r.replace(/\bfurthermore,?\s*/gi, "Also, ");
  r = r.replace(/\bmoreover,?\s*/gi, "Plus, ");
  r = r.replace(/\bnevertheless,?\s*/gi, "Still, ");
  r = r.replace(/\bconsequently,?\s*/gi, "So, ");
  r = r.replace(/\butilize\b/gi, "use"); r = r.replace(/\bfacilitate\b/gi, "help");
  r = r.replace(/\bdemonstrate\b/gi, "show"); r = r.replace(/\bdelve\b/gi, "dig");
  r = r.replace(/\s+/g, " ").trim();
  return r;
}

async function main() {
  console.log("=".repeat(60));
  console.log("HUMANIZER V3 - Multi-text consistency test");
  console.log("Strategy: Few-shot examples + word count control");
  console.log("=".repeat(60));

  const results = [];

  for (const sample of TEXTS) {
    const wc = sample.text.split(/\s+/).length;
    console.log(`\n📝 ${sample.name} (${wc} words)`);
    
    // Check original
    const origDet = await checkAI(sample.text);
    console.log(`  Original AI: ${(origDet.score * 100).toFixed(1)}%`);
    
    await new Promise(r => setTimeout(r, 1000));

    // Test with temp 0.7 (best WC match from v2)
    try {
      const prompt = buildPrompt(wc);
      let raw = await callGroq(prompt, `Rewrite this (keep around ${wc} words):\n\n${sample.text}`, 0.7);
      raw = raw.replace(/^(Here'?s?|Below|Sure|Okay|I'?ve?|The rewritten|Here is|Note:).*?[:\n]\s*/i, "").replace(/\n+/g, " ").trim();
      raw = postProcess(raw);

      const newWC = raw.split(/\s+/).length;
      
      await new Promise(r => setTimeout(r, 1500));
      const det = await checkAI(raw);
      
      const emoji = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
      console.log(`  ${emoji} Temp 0.7: AI ${(det.score * 100).toFixed(1)}% | ${newWC}w (±${Math.abs(newWC - wc)})`);
      results.push({ name: sample.name, temp: 0.7, score: det.score, wc: newWC, origWC: wc, text: raw });
    } catch (err) {
      console.log(`  ❌ Temp 0.7 ERROR: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 1000));

    // Test with temp 1.0 (also scored 0.1% in v2)
    try {
      const prompt = buildPrompt(wc);
      let raw = await callGroq(prompt, `Rewrite this (keep around ${wc} words):\n\n${sample.text}`, 1.0);
      raw = raw.replace(/^(Here'?s?|Below|Sure|Okay|I'?ve?|The rewritten|Here is|Note:).*?[:\n]\s*/i, "").replace(/\n+/g, " ").trim();
      raw = postProcess(raw);

      const newWC = raw.split(/\s+/).length;
      
      await new Promise(r => setTimeout(r, 1500));
      const det = await checkAI(raw);
      
      const emoji = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
      console.log(`  ${emoji} Temp 1.0: AI ${(det.score * 100).toFixed(1)}% | ${newWC}w (±${Math.abs(newWC - wc)})`);
      results.push({ name: sample.name, temp: 1.0, score: det.score, wc: newWC, origWC: wc, text: raw });
    } catch (err) {
      console.log(`  ❌ Temp 1.0 ERROR: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY:");
  console.log("=".repeat(60));
  
  const avg07 = results.filter(r => r.temp === 0.7);
  const avg10 = results.filter(r => r.temp === 1.0);
  
  const calc = (arr) => ({
    avgScore: (arr.reduce((s, r) => s + r.score, 0) / arr.length * 100).toFixed(1),
    avgWCDiff: (arr.reduce((s, r) => s + Math.abs(r.wc - r.origWC), 0) / arr.length).toFixed(0),
    passRate: (arr.filter(r => r.score <= 0.2).length / arr.length * 100).toFixed(0),
  });

  if (avg07.length > 0) {
    const s07 = calc(avg07);
    console.log(`Temp 0.7: Avg AI ${s07.avgScore}% | Avg WC diff ±${s07.avgWCDiff} | Pass rate: ${s07.passRate}%`);
  }
  if (avg10.length > 0) {
    const s10 = calc(avg10);
    console.log(`Temp 1.0: Avg AI ${s10.avgScore}% | Avg WC diff ±${s10.avgWCDiff} | Pass rate: ${s10.passRate}%`);
  }

  console.log("\nAll results:");
  for (const r of results) {
    const e = r.score <= 0.2 ? "✅" : r.score <= 0.4 ? "🟡" : "❌";
    console.log(`${e} ${r.name} (T${r.temp}): ${(r.score * 100).toFixed(1)}% AI | ${r.origWC}→${r.wc}w (±${Math.abs(r.wc - r.origWC)})`);
  }
}

main().catch(console.error);
