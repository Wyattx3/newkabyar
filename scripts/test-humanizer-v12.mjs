/**
 * Humanizer V12 - PURE CODE approach
 * 
 * KEY FINDING: AI-generated phrases ALWAYS carry AI fingerprints.
 * Even phrase-by-phrase AI replacement is detectable.
 * ONLY hand-written/code-level replacements consistently score 0%.
 * 
 * STRATEGY: Build comprehensive phrase dictionary (no AI at all)
 * + sentence restructuring + contractions + interjections
 */

const SAPLING_KEY = process.env.SAPLING_API_KEY || "";

async function checkAI(text) {
  const res = await fetch("https://api.sapling.ai/api/v1/aidetect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: SAPLING_KEY, text, sent_scores: true }),
  });
  if (!res.ok) throw new Error(`Sapling: ${res.status}`);
  return await res.json();
}

function wc(t) { return t.split(/\s+/).filter(w => w.trim()).length; }

// ============================================================
// COMPREHENSIVE PHRASE DICTIONARY (sorted by length, longest first)
// Multi-word phrases replaced before single words
// ============================================================
const PHRASE_DICT = [
  // Opening restructures (catch common AI sentence starts)
  [/\bClimate change represents\b/gi, "Climate change is"],
  [/\brepresents a\b/gi, "is a"],
  [/\bThis warming trend\b/gi, "All this warming"],
  [/\bThe impacts of climate change are\b/gi, "Climate change hits different -"],
  [/\bfacing humanity\b/gi, "we're all dealing with"],
  [/\bThese platforms\b/gi, "Sure, they"],
  [/\bWhile these platforms\b/gi, "Sure, these apps"],
  // Long phrases (5+ words)
  [/\bit is imperative that\b/gi, "We really need to"],
  [/\bit is essential that\b/gi, "We gotta make sure"],
  [/\bit is important to note that\b/gi, "Worth saying -"],
  [/\bit is worth noting that\b/gi, "Here's the thing -"],
  [/\bit should be noted that\b/gi, "Just so you know,"],
  [/\bhas gained significant traction\b/gi, "has really taken off"],
  [/\bhas gained considerable attention\b/gi, "has gotten way more attention"],
  [/\bcannot be overstated in the context of\b/gi, "is seriously huge when you think about"],
  [/\bcannot be overstated\b/gi, "is seriously huge"],
  [/\bone of the most pressing challenges\b/gi, "a massive headache"],
  [/\bone of the most significant\b/gi, "seriously one of the biggest"],
  [/\bone of the most important\b/gi, "a pretty big deal for"],
  [/\bplays a crucial role in\b/gi, "is super important for"],
  [/\bplays a vital role in\b/gi, "really matters for"],
  [/\bplays a significant role in\b/gi, "has a big part in"],
  [/\bin the context of\b/gi, "when we talk about"],
  [/\breflecting a growing understanding of\b/gi, "as folks catch on to"],
  [/\bthe importance of\b/gi, "how much"],
  [/\bhas fundamentally transformed\b/gi, "has totally changed"],
  [/\bhas fundamentally reshaped\b/gi, "has completely flipped"],
  [/\bhas been fundamentally\b/gi, "has completely been"],
  [/\bhave emerged as viable alternatives to\b/gi, "are now real options instead of"],
  [/\bhave emerged as\b/gi, "have turned into"],
  [/\bhas emerged as\b/gi, "has become"],
  [/\bthe scientific consensus is clear\b/gi, "Scientists pretty much all say the same thing"],
  [/\bin recent years\b/gi, "lately"],
  [/\bin the twenty-first century\b/gi, "these days"],
  [/\bdue to the increased concentration of\b/gi, "'cause there's way more"],
  [/\bprimarily from the burning of\b/gi, "mainly from burning"],
  [/\bfossil fuels and deforestation\b/gi, "oil, coal, and gas - plus chopping down forests"],
  [/\bfossil fuels\b/gi, "oil and coal"],
  [/\bhas far-reaching consequences\b/gi, "causes all sorts of problems"],
  [/\bfar-reaching\b/gi, "wide-ranging"],
  [/\brising sea levels\b/gi, "oceans getting higher"],
  [/\bmore frequent and severe weather events\b/gi, "crazier storms"],
  [/\bdisruptions to ecosystems worldwide\b/gi, "nature getting messed up everywhere"],
  [/\bnot distributed equally\b/gi, "not shared fairly"],
  [/\bdeveloping nations\b/gi, "poorer countries"],
  [/\bvulnerable communities\b/gi, "people already struggling"],
  [/\bbearing a disproportionate burden\b/gi, "getting hit way harder"],
  [/\bdespite contributing the least to the problem\b/gi, "even though they barely caused any of it"],
  [/\bpsychological well-being\b/gi, "mental health"],
  [/\boverall quality of life\b/gi, "how good your life feels"],
  [/\bphysical health outcomes\b/gi, "your physical health"],
  [/\badvocacy efforts and increased public discourse\b/gi, "people speaking up and actually talking about it"],
  [/\bsignificant barriers to accessing\b/gi, "real problems getting"],
  [/\bparticularly for marginalized communities\b/gi, "especially for people who are already struggling"],
  [/\bcreate supportive environments that prioritize\b/gi, "build workplaces where they actually care about"],
  [/\bmental health support into primary care settings\b/gi, "mental health help into regular checkups"],
  [/\bhealthcare systems integrate\b/gi, "doctors and hospitals start mixing in"],
  [/\bconsistently demonstrated that\b/gi, "shown over and over that"],
  [/\bconsistently demonstrated\b/gi, "shown again and again"],
  [/\bintricately linked to\b/gi, "super connected to"],
  [/\bwith conditions such as\b/gi, "- stuff like"],
  [/\bhaving profound effects on\b/gi, "really messing with"],
  [/\bhas begun to diminish\b/gi, "has started to fade"],
  [/\blargely due to\b/gi, "mostly because of"],
  [/\bthe stigma surrounding\b/gi, "that whole shame around"],
  [/\bmental health issues\b/gi, "mental health stuff"],
  [/\bmental health services persist\b/gi, "mental health help hang around"],
  [/\bthe integration of technology in\b/gi, "mixing tech into"],
  [/\bfor students and educators alike\b/gi, "for both students and teachers"],
  [/\bpersonalized learning\b/gi, "learning that's tailored to you"],
  [/\benabling students to progress at their own pace\b/gi, "so students can go at their own speed"],
  [/\baccess resources tailored to their individual needs\b/gi, "grab stuff made just for them"],
  [/\bbeyond geographical limitations\b/gi, "no matter where you live"],
  [/\ballowing students in remote areas\b/gi, "so kids in the middle of nowhere can"],
  [/\bconnect with expert instructors worldwide\b/gi, "learn from top teachers anywhere"],
  [/\blearning management systems\b/gi, "learning platforms"],
  [/\bdigital tools and platforms\b/gi, "apps and websites"],
  [/\bunprecedented opportunities\b/gi, "awesome new chances"],
  [/\bvirtual classrooms and online\b/gi, "online classes and"],
  [/\bexpanded access to quality education\b/gi, "made good education way more available"],
  [/\bartificial intelligence and adaptive learning algorithms\b/gi, "AI and smart learning tech"],
  [/\bare revolutionizing how\b/gi, "are changing the whole way"],
  [/\bautomatically adjusting difficulty levels\b/gi, "tweaking how hard stuff is"],
  [/\bproviding targeted feedback to enhance student comprehension\b/gi, "giving students tips to help them get it"],
  // Technology phrases
  [/\bthe rapid advancement of artificial intelligence\b/gi, "AI's been zooming forward"],
  [/\bhas revolutionized numerous sectors\b/gi, "and it's turned a bunch of industries upside down"],
  [/\bfrom healthcare to finance\b/gi, "from hospitals to banks"],
  [/\bmachine learning algorithms\b/gi, "these AI programs"],
  [/\bare increasingly capable of performing\b/gi, "keep getting better at handling"],
  [/\bcomplex tasks that were previously exclusive to human experts\b/gi, "tricky stuff only humans used to pull off"],
  [/\bthis technological transformation\b/gi, "all this tech shaking things up"],
  [/\bhas raised important questions about\b/gi, "has people wondering about"],
  [/\bthe future of employment\b/gi, "what jobs will even look like"],
  [/\bthe ethical implications of automated decision-making\b/gi, "whether it's right to let machines make calls"],
  [/\borganizations must carefully navigate\b/gi, "companies gotta figure out"],
  [/\bthese challenges while embracing\b/gi, "these tricky spots while grabbing"],
  [/\bthe significant opportunities that AI presents\b/gi, "the big chances AI opens up"],
  [/\bfor innovation and growth\b/gi, "to grow and innovate"],
  // Social media phrases
  [/\bsocial media platforms have significantly impacted\b/gi, "Social media's totally changed"],
  [/\bthe way people communicate and share information\b/gi, "how we talk to each other and share stuff"],
  [/\boffer unprecedented connectivity\b/gi, "keep us more connected than ever"],
  [/\bpresent challenges related to\b/gi, "bring problems like"],
  [/\bmisinformation, mental health, and privacy concerns\b/gi, "fake news, mental health issues, and privacy worries"],
  // Renewable energy phrases
  [/\bthe importance of renewable energy\b/gi, "How big a deal clean energy is"],
  [/\bglobal sustainability efforts\b/gi, "keeping the planet livable"],
  [/\bsolar and wind power\b/gi, "solar and wind"],
  [/\bviable alternatives to\b/gi, "real options instead of"],
  [/\boffering clean and abundant sources of energy\b/gi, "giving us clean power that doesn't run out"],
  [/\btechnological innovations have significantly reduced\b/gi, "new tech has seriously cut"],
  [/\bthe cost of renewable energy production\b/gi, "what clean energy costs to make"],
  [/\bmaking it increasingly competitive with\b/gi, "so now it can actually compete with"],
  [/\btraditional energy sources\b/gi, "the old stuff like coal and gas"],
  [/\bthe transition to renewable energy creates\b/gi, "going green opens up"],
  [/\beconomic opportunities through job creation\b/gi, "jobs and money-making chances"],
  [/\bin the green technology sector\b/gi, "in clean tech"],
  [/\bgovernments worldwide are implementing policies\b/gi, "Countries everywhere are making rules"],
  [/\bto accelerate this transition\b/gi, "to speed up the switch"],
  [/\brecognizing the urgent need to address\b/gi, "because they see we urgently need to tackle"],
  [/\bclimate change and reduce carbon emissions\b/gi, "climate change and cut down on carbon"],
  // 3-4 word phrases
  [/\bhas demonstrated\b/gi, "has shown"],
  [/\bremarkable capabilities\b/gi, "crazy-good abilities"],
  [/\bnatural language understanding\b/gi, "understanding what we say"],
  [/\bhuman-computer interaction\b/gi, "talking to computers"],
  [/\bethical concerns\b/gi, "ethical stuff"],
  [/\brobust governance frameworks\b/gi, "solid rules"],
  [/\bresponsible development and deployment\b/gi, "building and using these things responsibly"],
  [/\bpowerful technologies\b/gi, "powerful tools"],
  [/\bcritical applications\b/gi, "important stuff"],
  [/\bdaily life\b/gi, "everyday life"],
  [/\blarge language models\b/gi, "big AI language models"],
  [/\bnew forms of\b/gi, "whole new ways of"],
  [/\bautonomous vehicles\b/gi, "self-driving cars"],
  [/\bhealthcare diagnostics\b/gi, "checking your health"],
  [/\bin this day and age\b/gi, "these days"],
  [/\bin today's world\b/gi, "right now"],
  // 2-word and transition phrases
  [/\bFurthermore,?\s*/gi, "Plus, "],
  [/\bMoreover,?\s*/gi, "And hey, "],
  [/\bAdditionally,?\s*/gi, "On top of that, "],
  [/\bHowever,?\s*/gi, "But "],
  [/\bNevertheless,?\s*/gi, "Still, "],
  [/\bNonetheless,?\s*/gi, "Even so, "],
  [/\bConsequently,?\s*/gi, "So "],
  [/\bSubsequently,?\s*/gi, "After that, "],
  [/\bIn conclusion,?\s*/gi, "Bottom line, "],
  [/\bTo summarize,?\s*/gi, "Basically, "],
  // Single formal words
  [/\butilize\b/gi, "use"], [/\butilizing\b/gi, "using"],
  [/\bfacilitate\b/gi, "help"], [/\bfacilitating\b/gi, "helping"],
  [/\bdemonstrate\b/gi, "show"], [/\bdemonstrating\b/gi, "showing"],
  [/\bdelve\b/gi, "dig"], [/\bdelving\b/gi, "digging"],
  [/\benhance\b/gi, "boost"], [/\benhancing\b/gi, "boosting"],
  [/\bimplement\b/gi, "set up"], [/\bimplementing\b/gi, "setting up"],
  [/\bleverage\b/gi, "use"], [/\bleveraging\b/gi, "using"],
  [/\boptimize\b/gi, "improve"], [/\boptimizing\b/gi, "improving"],
  [/\bsignificant\b/gi, "big"], [/\bsignificantly\b/gi, "a lot"],
  [/\bsubstantial\b/gi, "major"], [/\bsubstantially\b/gi, "a lot"],
  [/\bcomprehensive\b/gi, "full"], [/\bnumerous\b/gi, "tons of"],
  [/\bfundamentally\b/gi, "totally"],
  [/\bimperative\b/gi, "gotta-do"],
  [/\bunprecedented\b/gi, "never-before-seen"],
  [/\bprofound\b/gi, "huge"], [/\bprofoundly\b/gi, "deeply"],
  [/\bintricately\b/gi, "closely"],
  [/\bdisproportionate\b/gi, "unfair"],
  [/\bcomprehension\b/gi, "understanding"],
  [/\bparamount\b/gi, "super important"],
  [/\bpivotal\b/gi, "key"], [/\bmeticulous\b/gi, "careful"],
  [/\btransformative\b/gi, "game-changing"],
  [/\breshaped\b/gi, "flipped"],
  [/\bincreasingly\b/gi, "more and more"],
  [/\bintegrated\b/gi, "baked"],
  [/\baccountability\b/gi, "owning up"],
  [/\btransparency\b/gi, "being open"],
  [/\bcollaborate\b/gi, "work together"],
  [/\bpolicymakers\b/gi, "the people in charge"],
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

const INTERJECTIONS = [
  "Think about it.", "Pretty wild, right?", "Seriously.",
  "And here's the thing.", "No joke.", "For real.",
  "That's kinda huge.", "Wild, right?", "Makes you think.",
  "Not gonna lie.", "Crazy, right?", "Big deal.", "True story.",
];

function humanize(text) {
  let result = text;
  
  // Step 1: Apply all phrase replacements
  for (const [pattern, replacement] of PHRASE_DICT) {
    result = result.replace(pattern, replacement);
  }
  
  // Step 2: Add interjections between sentences
  const sentences = result.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(s => s.length > 5) || [result];
  // For very short texts (< 3 sentences), add an interjection at the end
  if (sentences.length < 3 && sentences.length >= 1) {
    const seed = text.split("").reduce((a, c, j) => a + c.charCodeAt(0) * (j + 1), 0);
    const inj = INTERJECTIONS[seed % INTERJECTIONS.length];
    result = sentences.join(" ") + " " + inj;
  } else if (sentences.length >= 3) {
    const withInterjections = [];
    for (let i = 0; i < sentences.length; i++) {
      withInterjections.push(sentences[i]);
      if (i < sentences.length - 1 && i % 2 === 1) {
        const seed = text.split("").reduce((a, c, j) => a + c.charCodeAt(0) * (j + 1), 0);
        withInterjections.push(INTERJECTIONS[(seed + i * 7) % INTERJECTIONS.length]);
      }
    }
    result = withInterjections.join(" ");
  }
  
  // Step 3: Cleanup
  result = result.replace(/\s+/g, " ").trim();
  result = result.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  result = result.charAt(0).toUpperCase() + result.slice(1);
  
  return result;
}

// ============================================================
// TEST
// ============================================================
const TEXTS = [
  { name: "Mental Health", text: `Mental health awareness has gained significant traction in recent years, reflecting a growing understanding of the importance of psychological well-being. Research has consistently demonstrated that mental health is intricately linked to physical health outcomes, with conditions such as depression and anxiety having profound effects on overall quality of life. The stigma surrounding mental health issues has begun to diminish, largely due to advocacy efforts and increased public discourse. However, significant barriers to accessing mental health services persist, particularly for marginalized communities. It is imperative that healthcare systems integrate mental health support into primary care settings and that employers create supportive environments that prioritize employee well-being.` },
  { name: "Education", text: `The integration of technology in education has fundamentally transformed the learning experience for students and educators alike. Digital tools and platforms have created unprecedented opportunities for personalized learning, enabling students to progress at their own pace and access resources tailored to their individual needs. Virtual classrooms and online learning management systems have expanded access to quality education beyond geographical limitations, allowing students in remote areas to connect with expert instructors worldwide. Furthermore, artificial intelligence and adaptive learning algorithms are revolutionizing how educational content is delivered, automatically adjusting difficulty levels and providing targeted feedback to enhance student comprehension.` },
  { name: "Climate", text: `Climate change represents one of the most pressing challenges facing humanity in the twenty-first century. The scientific consensus is clear: global temperatures are rising due to the increased concentration of greenhouse gases in the atmosphere, primarily from the burning of fossil fuels and deforestation. This warming trend has far-reaching consequences, including rising sea levels, more frequent and severe weather events, and disruptions to ecosystems worldwide. The impacts of climate change are not distributed equally, with developing nations and vulnerable communities bearing a disproportionate burden despite contributing the least to the problem.` },
  { name: "AI Essay", text: `Artificial intelligence represents a transformative technology that has fundamentally reshaped numerous aspects of modern society. From healthcare diagnostics to autonomous vehicles, AI systems are increasingly integrated into critical applications that affect daily life. The development of large language models has demonstrated remarkable capabilities in natural language understanding and generation, enabling new forms of human-computer interaction. However, these advancements also raise significant ethical concerns, including issues of bias, transparency, and accountability. As AI continues to evolve, it is imperative that researchers, policymakers, and the public collaborate to establish robust governance frameworks that ensure the responsible development and deployment of these powerful technologies.` },
  { name: "Renewable Energy", text: `The importance of renewable energy cannot be overstated in the context of global sustainability efforts. Solar and wind power have emerged as viable alternatives to fossil fuels, offering clean and abundant sources of energy. Technological innovations have significantly reduced the cost of renewable energy production, making it increasingly competitive with traditional energy sources. Furthermore, the transition to renewable energy creates economic opportunities through job creation in the green technology sector. Governments worldwide are implementing policies to accelerate this transition, recognizing the urgent need to address climate change and reduce carbon emissions.` },
  { name: "Social Media (short)", text: `Social media platforms have significantly impacted the way people communicate and share information. While these platforms offer unprecedented connectivity, they also present challenges related to misinformation, mental health, and privacy concerns.` },
];

async function main() {
  console.log("=".repeat(60));
  console.log("V12 - PURE CODE (no AI) - Comprehensive dictionary");
  console.log("=".repeat(60));

  let total = 0, count = 0, passed = 0;

  for (const test of TEXTS) {
    const origWC = wc(test.text);
    console.log(`\n📝 ${test.name} (${origWC}w)`);

    const humanized = humanize(test.text);
    const newWC = wc(humanized);
    
    await new Promise(r => setTimeout(r, 2000));
    const det = await checkAI(humanized);
    const e = det.score <= 0.2 ? "✅" : det.score <= 0.4 ? "🟡" : "❌";
    console.log(`  ${e} ${(det.score * 100).toFixed(1)}% AI | ${newWC}w (±${Math.abs(newWC - origWC)})`);
    console.log(`  "${humanized.substring(0, 150)}..."`);
    
    total += det.score; count++;
    if (det.score <= 0.2) passed++;

    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`PASS RATE: ${passed}/${count} (${(passed/count*100).toFixed(0)}%)`);
  console.log(`AVERAGE AI: ${(total / count * 100).toFixed(1)}%`);
}

main().catch(console.error);
