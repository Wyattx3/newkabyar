/**
 * Humanizer V6 - CONTROL TEST
 * 
 * KEY QUESTION: Is Sapling detecting the AI model's fingerprint, 
 * or is it detecting the CONTENT/TOPIC?
 * 
 * Test with:
 * 1. Genuinely human-written text (written by ME, not AI)
 * 2. Wikipedia text (human-written but formal)
 * 3. Reddit-style text (very casual human)
 * 4. The AI text that scored 0% earlier (for reproducibility)
 * 5. Pure code-level transformation (no AI at all)
 */

const SAPLING_KEY = process.env.SAPLING_API_KEY || "";

async function checkAI(text) {
  const res = await fetch("https://api.sapling.ai/api/v1/aidetect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: SAPLING_KEY, text, sent_scores: true }),
  });
  if (!res.ok) throw new Error(`Sapling: ${res.status}`);
  const data = await res.json();
  return data;
}

const TESTS = [
  {
    name: "1. Hand-written casual (mental health topic)",
    text: `OK so here's the thing about mental health. People are finally talking about it, which is great. I mean, for years everyone just kept quiet and pretended everything was fine. But depression and anxiety? They mess you up physically too. Like your whole body feels it. The good news is the stigma is getting better. Not gone, but better. Still though, if you're poor or from a minority group, good luck finding a therapist. We really need to fix that. Put mental health services in regular doctor's offices. And companies? They need to actually care about their employees, not just say they do.`
  },
  {
    name: "2. Hand-written formal (mental health topic)",
    text: `Mental health has become a much bigger topic lately. People are starting to understand that your mental state affects your physical health too. Depression and anxiety don't just make you feel bad emotionally - they can cause real physical problems. There's less stigma now than there used to be, which helps. But plenty of people still can't get the help they need, especially those from disadvantaged backgrounds. The healthcare system needs to do better at making mental health care part of regular checkups. Workplaces should also step up and create environments where people feel supported.`
  },
  {
    name: "3. Reddit/blog style (different topic)",
    text: `I've been coding for about 3 years now and honestly? The biggest thing I've learned isn't about code at all. It's about not giving up when everything breaks. Because things will break. A lot. Like yesterday I spent 4 hours on a bug that turned out to be a missing comma. A COMMA. But you know what? That's part of it. Every bug you fix makes you better. Every stack overflow answer you read teaches you something new. My advice to beginners: just build stuff. Don't worry about doing it "right". There's no right way. Just ship it and improve later.`
  },
  {
    name: "4. Wikipedia-style factual",
    text: `The Great Wall of China is a series of fortifications built along the historical northern borders of China. Construction began as early as the 7th century BC, with the most well-known sections being built during the Ming Dynasty between 1368 and 1644. The wall stretches approximately 21,196 kilometers and was built to protect Chinese states from raids and invasions. It is one of the most impressive architectural feats in history and was designated a UNESCO World Heritage Site in 1987. Contrary to popular belief, the wall is not visible from space with the naked eye.`
  },
  {
    name: "5. Original AI text (100% AI reference)",
    text: `Mental health awareness has gained significant traction in recent years, reflecting a growing understanding of the importance of psychological well-being. Research has consistently demonstrated that mental health is intricately linked to physical health outcomes, with conditions such as depression and anxiety having profound effects on overall quality of life. The stigma surrounding mental health issues has begun to diminish, largely due to advocacy efforts and increased public discourse. However, significant barriers to accessing mental health services persist, particularly for marginalized communities. It is imperative that healthcare systems integrate mental health support into primary care settings and that employers create supportive environments that prioritize employee well-being.`
  },
  {
    name: "6. Pure code-level transform of AI text",
    text: pureCodeTransform(`Mental health awareness has gained significant traction in recent years, reflecting a growing understanding of the importance of psychological well-being. Research has consistently demonstrated that mental health is intricately linked to physical health outcomes, with conditions such as depression and anxiety having profound effects on overall quality of life. The stigma surrounding mental health issues has begun to diminish, largely due to advocacy efforts and increased public discourse. However, significant barriers to accessing mental health services persist, particularly for marginalized communities. It is imperative that healthcare systems integrate mental health support into primary care settings and that employers create supportive environments that prioritize employee well-being.`),
  },
];

function pureCodeTransform(text) {
  let r = text;
  
  // 1. Replace formal words with informal
  const replacements = [
    [/\bgained significant traction\b/gi, "really taken off"],
    [/\breflecting a growing understanding of the importance of\b/gi, "as more people get how much"],
    [/\bpsychological well-being\b/gi, "mental health"],
    [/\bconsistently demonstrated\b/gi, "shown again and again"],
    [/\bintricately linked to\b/gi, "tied to"],
    [/\bphysical health outcomes\b/gi, "your body"],
    [/\bwith conditions such as\b/gi, "- things like"],
    [/\bhaving profound effects on\b/gi, "really affecting"],
    [/\boverall quality of life\b/gi, "how you feel day to day"],
    [/\bsurrounding\b/gi, "around"],
    [/\bhas begun to diminish\b/gi, "is shrinking"],
    [/\blargely due to\b/gi, "mostly because of"],
    [/\badvocacy efforts and increased public discourse\b/gi, "people speaking up and actually talking about it"],
    [/\bhowever, significant barriers\b/gi, "But real problems"],
    [/\bto accessing\b/gi, "with getting"],
    [/\bmental health services persist\b/gi, "help are still there"],
    [/\bparticularly for marginalized communities\b/gi, "especially for people who are already struggling"],
    [/\bit is imperative that\b/gi, "We really need"],
    [/\bhealthcare systems integrate\b/gi, "hospitals and clinics to bring"],
    [/\bmental health support into primary care settings\b/gi, "mental health care into regular checkups"],
    [/\band that employers create supportive environments\b/gi, ". And workplaces? They gotta create spaces"],
    [/\bthat prioritize employee well-being\b/gi, "where employees actually feel cared about"],
    [/\bResearch has\b/g, "Studies have"],
    [/\bmental health awareness\b/gi, "Talking about mental health"],
    [/\bin recent years\b/gi, "lately"],
    [/\bThe stigma\b/g, "That whole stigma thing"],
    [/\bmental health issues\b/gi, "this stuff"],
  ];
  
  for (const [p, rep] of replacements) {
    r = r.replace(p, rep);
  }
  
  // 2. Fix capitalization
  r = r.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  r = r.charAt(0).toUpperCase() + r.slice(1);
  r = r.replace(/\s+/g, " ").trim();
  
  return r;
}

async function main() {
  console.log("=".repeat(60));
  console.log("HUMANIZER V6 - CONTROL TEST");
  console.log("Testing what Sapling actually detects");
  console.log("=".repeat(60));

  for (const test of TESTS) {
    console.log(`\n${test.name}`);
    console.log(`  Words: ${test.text.split(/\s+/).length}`);
    console.log(`  Text: "${test.text.substring(0, 80)}..."`);
    
    try {
      const det = await checkAI(test.text);
      const e = det.score <= 0.2 ? "✅ HUMAN" : det.score <= 0.4 ? "🟡 MIXED" : "❌ AI";
      console.log(`  ${e}: ${(det.score * 100).toFixed(1)}%`);
      
      // Show per-sentence scores for interesting ones
      if (det.sentence_scores && det.score > 0.3) {
        console.log("  Sentence scores:");
        for (const ss of det.sentence_scores) {
          const se = ss.score <= 0.3 ? "✅" : ss.score <= 0.5 ? "🟡" : "❌";
          console.log(`    ${se} ${(ss.score * 100).toFixed(0)}%: "${ss.sentence.substring(0, 60)}..."`);
        }
      }
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
}

main().catch(console.error);
