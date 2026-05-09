#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [titleArg, ...captionParts] = process.argv.slice(2);

if (!titleArg) {
  console.error('Usage: node scripts/new-post.mjs "Title" [caption]');
  process.exit(1);
}

const date = new Date();
const iso = date.toISOString().slice(0, 10);
const slug = titleArg
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const caption = captionParts.join(' ');
const postPath = path.join('content', 'posts', `${iso}-${slug}.md`);
const imagePath = `assets/posts/${iso.slice(0, 4)}/${slug}.png`;

const body = `---\nlayout: layouts/post.njk\ntags:\n  - post\ntitle: ${titleArg}\ndate: ${iso}\nimage: ${imagePath}\ncaption: ${caption || 'TODO'}\ntuesdayComment: TODO\n---\n`;

fs.writeFileSync(postPath, body);
console.log(postPath);
