import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

await fs.mkdir('public/styles', { recursive: true });
const routes = JSON.parse(await fs.readFile('content/routes.json', 'utf8'));
for (const route of routes) {
  const data = JSON.parse(await fs.readFile(`content/${route.replaceAll('/', '__') || 'home'}.json`, 'utf8'));
  const hash = createHash('sha256').update(data.css).digest('hex').slice(0, 16);
  await fs.writeFile(`public/styles/${hash}.css`, data.css);
}
console.log(`Prepared stylesheets for ${routes.length} pages.`);
