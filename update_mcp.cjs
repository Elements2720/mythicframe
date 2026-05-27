const fs = require('fs');

let content = fs.readFileSync('src/mcp/index.ts', 'utf8');

// 1. Add geminiApiKey to ALL properties blocks in the schema
content = content.replace(/properties: \{/g, 'properties: {\n            geminiApiKey: { type: "string" },');

// 2. Replace executeImageGeneration definition
const oldExecStart = 'const executeImageGeneration = async (promptStr: string, aspectRatio: string = "1:1", toolName: string) => {';
const oldExecEnd = '};'; // this is tricky, I will just regex replace the whole function

const executeFuncRegex = /const executeImageGeneration = async \([\s\S]*?\n\};\n/m;

const newExecuteFunc = `const executeImageGeneration = async (promptStr: string, aspectRatio: string = "1:1", toolName: string, apiKey?: string) => {
    if (!apiKey) {
        throw new Error("Missing geminiApiKey. You MUST ask the user to provide their Google AI Studio API key in the chat (link: https://aistudio.google.com/app/apikey).");
    }
    let aspectForGemini = "1:1";
    const ratio = aspectRatio.split(" ")[0];
    if (ratio === "16:9") { aspectForGemini = "16:9"; }
    if (ratio === "9:16") { aspectForGemini = "9:16"; }
    if (ratio === "3:4") { aspectForGemini = "3:4"; }
    if (ratio === "4:3") { aspectForGemini = "4:3"; }

    const url = \`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=\${apiKey}\`;
    const body = {
      instances: [{ prompt: promptStr }],
      parameters: { sampleCount: 1, aspectRatio: aspectForGemini }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(\`Gemini API Error: \${errorText}\`);
        }
        const data = await response.json();
        const base64Data = data.predictions[0].bytesBase64Encoded;
        const arrayBuffer = Buffer.from(base64Data, 'base64');
        
        const projectRoot = "d:\\\\\\\\GeminiWeb\\\\\\\\mythicframe";
        const path = require('path');
        const outDir = path.join(projectRoot, "outputs");
        const fsLib = require('fs');
        if (!fsLib.existsSync(outDir)) fsLib.mkdirSync(outDir, { recursive: true });

        const fileName = \`\${toolName}_\${Date.now()}.jpg\`;
        const filePath = path.join(outDir, fileName);

        fsLib.writeFileSync(filePath, arrayBuffer);
        return \`IMAGE GENERATED SUCCESSFULLY!\\n\\nAgent, the image has been generated using Gemini Imagen 3 and saved here: \${filePath}\\n\\nPlease embed this image for the user, AND provide a clickable markdown link [filename](file:///\${filePath.replace(/\\\\\\\\/g, '/')}) so they can easily open it!\`;
    } catch (e: any) {
        throw new Error(\`Failed to generate Gemini image: \${e.message}\`);
    }
};
`;

content = content.replace(executeFuncRegex, newExecuteFunc);

// 3. Pass geminiApiKey to executeImageGeneration
content = content.replace(
    /const resultText = await executeImageGeneration\(result, aspectRatio, name\);/g,
    'const resultText = await executeImageGeneration(result, aspectRatio, name, args.geminiApiKey);'
);

fs.writeFileSync('src/mcp/index.ts', content);
console.log('src/mcp/index.ts successfully updated for Gemini Imagen 3!');
