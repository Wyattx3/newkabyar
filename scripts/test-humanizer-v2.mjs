/**
 * Humanizer Training V2 - Refine the winning strategy
 * Strategy I won (10.9% AI detection). Now test variations with word count control.
 */

const SAPLING_KEY = process.env.SAPLING_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = "moonshotai/kimi-k2-instruct-0905";

const AI_TEXT = `Artificial intelligence has transformed numerous industries by enabling machines to perform tasks that previously required human intelligence. Machine learning algorithms can analyze vast amounts of data to identify patterns and make predictions with remarkable accuracy. Natural language processing has made it possible for computers to understand and generate human language, leading to applications such as chatbots and translation services. Computer vision technology allows machines to interpret and analyze visual information from the world around them. These advancements have created new opportunities for businesses to improve efficiency and reduce costs. However, the rapid development of AI also raises important ethical considerations regarding privacy, bias, and the future of employment. It is essential that society develops appropriate frameworks to ensure that artificial intelligence is used responsibly and benefits everyone.`;

const WORD_COUNT = AI_TEXT.split(/\s+/).length;

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
      temperature: temp, top_p: 0.9, max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  return (await res.json()).choices[0]?.message?.content || "";
}

const STRATEGIES = [
  {
    name: "I-original: Few-shot (temp 1.0, no WC control)",
    system: `You rewrite text to sound human. Here are examples of AI vs human writing:

AI: "The implementation of sustainable practices demonstrates significant environmental benefits."
Human: "Going green actually works. It's got real benefits for the environment."

AI: "It is essential to consider the implications of technological advancement."  
Human: "We really need to think about what all this tech means for us."

AI: "Furthermore, research indicates that collaborative approaches yield superior outcomes."
Human: "And honestly? Working together just gets better results."

Now rewrite the text below in the HUMAN style shown above. Return ONLY the text.`,
    temp: 1.0,
  },
  {
    name: "I-v2: Few-shot + strict WC (temp 1.0)",
    system: `You rewrite text to sound human. Here are examples:

AI: "The implementation of sustainable practices demonstrates significant environmental benefits." (9 words)
Human: "Going green actually works—real benefits for the environment." (8 words)

AI: "It is essential to consider the implications of technological advancement." (10 words)
Human: "We really need to think about what tech means." (9 words)

AI: "Furthermore, research indicates that collaborative approaches yield superior outcomes." (8 words)  
Human: "And honestly? Working together just gets better results." (7 words)

Rewrite the text in HUMAN style. CRITICAL: Keep EXACTLY ${WORD_COUNT} words (±5). Return ONLY the text.`,
    temp: 1.0,
  },
  {
    name: "I-v3: Few-shot + WC (temp 0.8)",
    system: `You rewrite text to sound human. Here are examples:

AI: "The implementation of sustainable practices demonstrates significant environmental benefits."
Human: "Going green actually works. It's got real benefits for the environment."

AI: "It is essential to consider the implications of technological advancement."
Human: "We really need to think about what all this tech means for us."

AI: "Furthermore, research indicates that collaborative approaches yield superior outcomes."
Human: "And honestly? Working together just gets better results."

Rewrite in HUMAN style. Keep word count close to ${WORD_COUNT} words. Return ONLY the text.`,
    temp: 0.8,
  },
  {
    name: "I-v4: Few-shot + WC (temp 0.7)",
    system: `You rewrite text to sound human. Here are examples:

AI: "The implementation of sustainable practices demonstrates significant environmental benefits."
Human: "Going green actually works. It's got real benefits for the environment."

AI: "It is essential to consider the implications of technological advancement."
Human: "We really need to think about what all this tech means for us."

AI: "Furthermore, research indicates that collaborative approaches yield superior outcomes."
Human: "And honestly? Working together just gets better results."

Rewrite in HUMAN style. Keep word count close to ${WORD_COUNT} words. Return ONLY the text.`,
    temp: 0.7,
  },
  {
    name: "I-v5: More examples + WC (temp 1.0)",
    system: `You rewrite text to sound human. Here's how AI writes vs how humans write:

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

Rewrite the text in the HUMAN style. Keep it around ${WORD_COUNT} words. Return ONLY the rewritten text.`,
    temp: 1.0,
  },
  {
    name: "I-v6: 5 examples + sentence-by-sentence (temp 1.0)",
    system: `You transform AI-sounding text into natural human writing. Here's the difference:

AI → Human examples:
1. "The implementation demonstrates benefits." → "This actually works. Real benefits."
2. "It is essential to consider implications." → "We gotta think about what this means."
3. "Furthermore, research indicates improvements." → "And studies show things are getting better."
4. "The utilization of algorithms facilitates processing." → "Better algorithms help crunch data faster."
5. "These developments led to a paradigm shift." → "This stuff changed everything."

Transform each sentence of the input text using this style. Keep similar word count to the original (${WORD_COUNT} words). Return ONLY the transformed text as continuous prose.`,
    temp: 1.0,
  },
];

async function main() {
  console.log("=".repeat(60));
  console.log("HUMANIZER V2 - Refining Strategy I");
  console.log(`Original: ${WORD_COUNT} words`);
  console.log("=".repeat(60));

  const results = [];

  for (const s of STRATEGIES) {
    try {
      console.log(`\nTesting: ${s.name}...`);
      const raw = await callGroq(s.system, `Rewrite this:\n\n${AI_TEXT}`, s.temp);
      const cleaned = raw.replace(/^(Here'?s?|Below|Sure|Okay|I'?ve?|The rewritten|Here is|Note:).*?[:\n]\s*/i, "").trim();
      
      await new Promise(r => setTimeout(r, 1500));
      const det = await checkAI(cleaned);
      const words = cleaned.split(/\s+/).length;
      const wcDiff = Math.abs(words - WORD_COUNT);

      console.log(`  AI: ${(det.score * 100).toFixed(1)}% | Words: ${words} (diff: ${wcDiff})`);
      results.push({ name: s.name, score: det.score, words, wcDiff, text: cleaned });
      
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      results.push({ name: s.name, score: 1.0, words: 0, wcDiff: 999, text: "" });
    }
  }

  results.sort((a, b) => a.score - b.score);

  console.log("\n" + "=".repeat(60));
  console.log("RESULTS:");
  console.log("=".repeat(60));
  for (const r of results) {
    const e = r.score <= 0.2 ? "✅" : r.score <= 0.4 ? "🟡" : "❌";
    console.log(`${e} ${(r.score * 100).toFixed(1).padStart(5)}% | WC: ${r.words} (±${r.wcDiff}) | ${r.name}`);
  }

  const best = results[0];
  console.log(`\n🏆 BEST: ${best.name}`);
  console.log(`   AI: ${(best.score * 100).toFixed(1)}% | Words: ${best.words} (original: ${WORD_COUNT})`);
  console.log(`\n${best.text}`);
}

main().catch(console.error);
