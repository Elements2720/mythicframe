import { buildIllustrationPrompt } from './src/services/promptTemplates.js';
import fs from 'fs';

const { textPrompt } = buildIllustrationPrompt(
  'character in armor', 
  { setting: 'High Fantasy', tone: 'Epic', visualConstraints: '' }, 
  'fate ufotable art style', 
  { mode: 'transparent', color: '#ffffff', allowTransparency: true, promptFragment: '' }, 
  []
); 

const encoded = encodeURIComponent(textPrompt); 
const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=1024&nologo=true&enhance=false`;

console.log("Generating 3:4 via free Mythic api...");

fetch(url)
  .then(r=>r.arrayBuffer())
  .then(b=>{
      if (!fs.existsSync("outputs")) fs.mkdirSync("outputs");
      fs.writeFileSync('./outputs/fate_armor_3x4.jpg', Buffer.from(b)); 
      console.log('success');
  })
  .catch(console.error);
