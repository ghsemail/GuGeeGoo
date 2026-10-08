import fs from 'node:fs';
import path from 'node:path';
import toIco from 'to-ico';

const [pngDir, outIco] = process.argv.slice(2);
if (!pngDir || !outIco) {
  console.error('Usage: node pack-game-icon.mjs <pngDir> <out.ico>');
  process.exit(1);
}

const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = sizes.map((s) => fs.readFileSync(path.join(pngDir, `gamepad-${s}.png`)));
const ico = await toIco(pngs);
fs.writeFileSync(outIco, ico);
console.log(`Wrote ${outIco} (${ico.length} bytes, ${sizes.length} sizes)`);
