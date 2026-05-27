const fs = require('fs');
const path = require('path');

const apiKey = "AIzaSyDupJtONYHoUZKWvxg6Ic7CxuK8hAZ3A4M";
const promptStr = "Aria, Renegade Peasant, Demonized Human Vanguard. Holding Pitchfork (Polished Silver, mechanical brass alloys). Hair: rose pink, short asymmetric bob. Eyes: metallic silver eyes. Skin: tanned lightly scarred skin. Wearing attire: velvet aristocratic attire, integrated chestplate, polished with ornate floral etchings. Traits: demon horns, runic tattoos. Highly detailed elite fantasy character, vibrant silhouette. Fate ufotable anime style. Chibi mode. Solid background.";

async function run() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key=${apiKey}`;
    const body = {
      instances: [{ prompt: promptStr }],
      parameters: { sampleCount: 1, aspectRatio: "3:4" }
    };
    
    console.log("Fetching...");
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        console.error(await response.text());
        return;
    }
    const data = await response.json();
    const base64Data = data.predictions[0].bytesBase64Encoded;
    const arrayBuffer = Buffer.from(base64Data, 'base64');
    
    const filePath = path.join(__dirname, "aria_gemini_4_0.jpg");
    fs.writeFileSync(filePath, arrayBuffer);
    console.log(filePath);
}
run();
