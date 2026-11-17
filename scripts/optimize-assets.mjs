import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const directory = path.join(process.cwd(), 'public/assets');
const replacements = new Map();
let saved = 0;
for (const name of await fs.readdir(directory)) {
  if (!/\.(jpe?g|png)$/i.test(name)) continue;
  const file = path.join(directory, name);
  const stat = await fs.stat(file);
  if (stat.size < 250_000) continue;
  const target = name.replace(/\.[^.]+$/, '.webp');
  const result = await sharp(file).rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).webp({ quality: 92 }).toBuffer();
  if (result.byteLength >= stat.size) continue;
  await fs.writeFile(path.join(directory, target), result);
  replacements.set(`/assets/${name}`, `/assets/${target}`);
  saved += stat.size - result.byteLength;
}
for (const folder of ['content', 'public/assets']) {
  for (const name of await fs.readdir(folder)) {
    if (!/\.(json|css)$/.test(name)) continue;
    const file = path.join(folder, name);
    let text = await fs.readFile(file, 'utf8');
    for (const [from, to] of replacements) text = text.replaceAll(from, to);
    await fs.writeFile(file, text);
  }
}
for (const file of replacements.keys()) await fs.unlink(path.join(process.cwd(), 'public', file));
console.log(`Optimized ${replacements.size} photographs; saved ${(saved / 1024 / 1024).toFixed(1)} MB.`);
