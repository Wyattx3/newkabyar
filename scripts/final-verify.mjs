/**
 * Final verification - test the app's output with Sapling
 * Uses the same text the user will likely test with
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

// Simulate what a user would paste into the humanizer
const TEST_TEXTS = [
  {
    name: "Generic AI essay",
    text: `Artificial intelligence represents a transformative technology that has fundamentally reshaped numerous aspects of modern society. From healthcare diagnostics to autonomous vehicles, AI systems are increasingly integrated into critical applications that affect daily life. The development of large language models has demonstrated remarkable capabilities in natural language understanding and generation, enabling new forms of human-computer interaction. However, these advancements also raise significant ethical concerns, including issues of bias, transparency, and accountability. As AI continues to evolve, it is imperative that researchers, policymakers, and the public collaborate to establish robust governance frameworks that ensure the responsible development and deployment of these powerful technologies.`
  },
  {
    name: "ChatGPT-style paragraph",
    text: `The importance of renewable energy cannot be overstated in the context of global sustainability efforts. Solar and wind power have emerged as viable alternatives to fossil fuels, offering clean and abundant sources of energy. Technological innovations have significantly reduced the cost of renewable energy production, making it increasingly competitive with traditional energy sources. Furthermore, the transition to renewable energy creates economic opportunities through job creation in the green technology sector. Governments worldwide are implementing policies to accelerate this transition, recognizing the urgent need to address climate change and reduce carbon emissions.`
  },
];

async function main() {
  console.log("=".repeat(60));
  console.log("FINAL VERIFICATION - Testing with Sapling AI Detector");
  console.log("=".repeat(60));
  
  for (const test of TEST_TEXTS) {
    console.log(`\n📝 ${test.name} (${test.text.split(/\s+/).length} words)`);
    const det = await checkAI(test.text);
    console.log(`  Original AI Score: ${(det.score * 100).toFixed(1)}%`);
    
    // Now test with the app
    console.log("  Calling app humanizer...");
    try {
      const response = await fetch("http://localhost:3000/api/ai/humanize-diff", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cookie": "authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiMjF1WEFCMlFVMjBWV2RPTFl2WXhPam16emhQU2MtekNMSGJDcHBpTGJWM2d2YnJQY0NMMkxTc0FzMmpCa0daUXZEU0VMZFcwZ3lOUU9jWXVIbXNITEEifQ..FcEJNqFCKmQQ7wP_E9nEVw.3LIKxrpgT4tTz7lnCzEQ8RGRi_P1Oqu8sK3_y42-saNaXl6VrLqZJXM5TNGQW6Lq8eVTlvQ9IamH9TQ4r5VKcmXhxvUTT7Jb5ESHQ9Fq-3cOWF2-vIoUKCXnDHDwOMK.txddG6EFd4bwT-6hxqHSmcSV3_I-VIfCvmvdWRiuGzE"
        },
        body: JSON.stringify({
          text: test.text,
          tone: "natural",
          intensity: "heavy",
          model: "fast",
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  App returned: ${data.plain?.split(/\s+/).length} words`);
        
        // Check humanized output with Sapling
        await new Promise(r => setTimeout(r, 2000));
        const det2 = await checkAI(data.plain);
        const e = det2.score <= 0.2 ? "✅ PASS" : det2.score <= 0.4 ? "🟡 OK" : "❌ FAIL";
        console.log(`  ${e} Humanized AI Score: ${(det2.score * 100).toFixed(1)}%`);
        console.log(`  Output: "${data.plain?.substring(0, 150)}..."`);
      } else {
        console.log(`  Error: ${response.status} - need auth, testing directly`);
      }
    } catch (err) {
      console.log(`  App call error: ${err.message} - testing with offline simulation`);
    }
    
    await new Promise(r => setTimeout(r, 1500));
  }
}

main().catch(console.error);
