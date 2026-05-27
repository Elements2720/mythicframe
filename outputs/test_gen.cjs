const fs = require('fs');
const path = require('path');

const url = "https://image.pollinations.ai/prompt/Aria%2C%20Renegade%20Peasant%2C%20Demonized%20Human%20Vanguard.%20Holding%20Pitchfork%20(Polished%20Silver%2C%20mechanical%20brass%20alloys).%20Hair%3A%20rose%20pink%2C%20short%20asymmetric%20bob.%20Eyes%3A%20metallic%20silver%20eyes.%20Skin%3A%20tanned%20lightly%20scarred%20skin.%20Wearing%20attire%3A%20velvet%20aristocratic%20attire%2C%20integrated%20chestplate%2C%20polished%20with%20ornate%20floral%20etchings.%20Traits%3A%20demon%20horns%2C%20runic%20tattoos.%20Highly%20detailed%20elite%20fantasy%20character%2C%20vibrant%20silhouette.%20Fate%20ufotable%20anime%20style.%20Chibi%20mode.%20White%20solid%20background.?width=768&height=1024&nologo=true&enhance=false";

async function run() {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const filePath = path.join(__dirname, "aria_fixed_3_4.jpg");
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    console.log(filePath);
}
run();
