import { GoogleGenAI } from "@google/genai";
console.log(process.env.API_KEY ? "key ok" : "no key");
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
ai.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: 'a cat',
  config: { seed: 12345 }
}).then(res => console.log('top-level seed ok')).catch(e => console.error('top-level seed Error'));

ai.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: 'a dog',
  config: { imageConfig: { seed: 12345 } }
}).then(res => console.log('imageConfig seed ok')).catch(e => console.error('imageConfig seed Error', e.message));
