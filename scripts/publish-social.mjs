#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { BskyAgent, RichText } from '@atproto/api';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const siteData = require(path.join(repoRoot, 'src', 'src.11tydata.js'));

const args = process.argv.slice(2);
const opts = parseArgs(args);

async function main() {
  const postFiles = await resolvePostFiles(opts);
  if (postFiles.length === 0) {
    console.log('No new post files to publish.');
    return;
  }

  const configuredTargets = opts.dryRun ? ['bluesky', 'mastodon'] : getConfiguredTargets();
  if (!opts.dryRun && configuredTargets.length === 0) {
    console.log('No social targets configured. Run with --dry-run or add secrets.');
    return;
  }

  for (const postFile of postFiles) {
    const post = await loadPost(postFile);
    if (post.data.draftSocial === true) {
      console.log(`Skipping ${postFile}: draftSocial=true`);
      continue;
    }

    validatePost(post);
    const payload = await buildPayload(post);

    console.log(`Preparing ${payload.url}`);
    if (opts.dryRun) {
      printDryRun(payload, configuredTargets);
      continue;
    }

    if (configuredTargets.includes('bluesky')) {
      await publishToBluesky(payload);
    }

    if (configuredTargets.includes('mastodon')) {
      await publishToMastodon(payload);
    }
  }
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    post: null,
    range: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--post') {
      options.post = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--range') {
      options.range = [argv[i + 1], argv[i + 2]];
      i += 2;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function resolvePostFiles(options) {
  if (options.post) {
    return [options.post];
  }

  const range = options.range || inferGitRange();
  if (!range) {
    return [];
  }

  const diffOutput = await git([
    'diff',
    '--name-only',
    '--diff-filter=A',
    range[0],
    range[1],
    '--',
    'content/posts/*.md'
  ]);

  return diffOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function inferGitRange() {
  const before = process.env.GITHUB_EVENT_BEFORE || process.env.GITHUB_BEFORE || process.env.GIT_BEFORE;
  const after = process.env.GITHUB_SHA || process.env.GIT_AFTER;
  if (!before || !after || /^0+$/.test(before)) {
    return null;
  }
  return [before, after];
}

async function loadPost(postFile) {
  const absolute = path.resolve(repoRoot, postFile);
  const raw = await fs.readFile(absolute, 'utf8');
  const parsed = matter(raw);
  return {
    file: postFile,
    absolute,
    slug: path.basename(postFile, path.extname(postFile)).replace(/^\d{4}-\d{2}-\d{2}-/, ''),
    data: parsed.data
  };
}

function validatePost(post) {
  const requiredFields = ['title', 'image', 'imageAlt', 'caption'];
  for (const field of requiredFields) {
    const value = post.data[field];
    if (typeof value !== 'string' || value.trim() === '' || value.trim() === 'TODO') {
      throw new Error(`${post.file} is missing required social field: ${field}`);
    }
  }
}

async function buildPayload(post) {
  const hashtags = normalizeTags(post.data.socialTags);
  const url = new URL(`/posts/${post.slug}/`, siteData.site.url).toString();
  const textParts = [post.data.caption.trim()];
  if (hashtags.length > 0) {
    textParts.push(hashtags.join(' '));
  }
  textParts.push(url);

  const imagePath = path.resolve(repoRoot, String(post.data.image).replace(/^\//, ''));
  const imageBuffer = await fs.readFile(imagePath);

  return {
    file: post.file,
    title: post.data.title.trim(),
    caption: post.data.caption.trim(),
    imageAlt: post.data.imageAlt.trim(),
    url,
    text: textParts.join('\n\n'),
    hashtags,
    imagePath,
    imageBuffer,
    imageMimeType: mimeTypeFor(imagePath)
  };
}

function normalizeTags(value) {
  const items = Array.isArray(value) ? value : typeof value === 'string' && value.trim() ? [value] : ['ShitMyAISays'];
  return items
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((item) => (item.startsWith('#') ? item : `#${item.replace(/\s+/g, '')}`));
}

function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      throw new Error(`Unsupported image type for social upload: ${ext || '(none)'}`);
  }
}

function getConfiguredTargets() {
  const targets = [];
  if (process.env.BSKY_IDENTIFIER && process.env.BSKY_APP_PASSWORD) {
    targets.push('bluesky');
  }
  if (process.env.MASTODON_BASE_URL && process.env.MASTODON_ACCESS_TOKEN) {
    targets.push('mastodon');
  }
  return targets;
}

function printDryRun(payload, configuredTargets) {
  console.log(JSON.stringify({
    mode: 'dry-run',
    targets: configuredTargets,
    file: payload.file,
    url: payload.url,
    imagePath: payload.imagePath,
    imageAlt: payload.imageAlt,
    text: payload.text
  }, null, 2));
}

async function publishToBluesky(payload) {
  const agent = new BskyAgent({ service: 'https://bsky.social' });
  await agent.login({
    identifier: process.env.BSKY_IDENTIFIER,
    password: process.env.BSKY_APP_PASSWORD
  });

  const upload = await agent.uploadBlob(new Uint8Array(payload.imageBuffer), {
    encoding: payload.imageMimeType
  });

  const richText = new RichText({ text: payload.text });
  await richText.detectFacets(agent);

  const response = await agent.post({
    text: richText.text,
    facets: richText.facets,
    embed: {
      $type: 'app.bsky.embed.images',
      images: [
        {
          alt: payload.imageAlt,
          image: upload.data.blob
        }
      ]
    },
    createdAt: new Date().toISOString()
  });

  console.log(`Bluesky post created: ${response.uri}`);
}

async function publishToMastodon(payload) {
  const mediaForm = new FormData();
  mediaForm.set('file', new Blob([payload.imageBuffer], { type: payload.imageMimeType }), path.basename(payload.imagePath));
  mediaForm.set('description', payload.imageAlt);

  const mediaResponse = await fetch(new URL('/api/v2/media', process.env.MASTODON_BASE_URL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MASTODON_ACCESS_TOKEN}`
    },
    body: mediaForm
  });

  if (!mediaResponse.ok) {
    throw new Error(`Mastodon media upload failed: ${mediaResponse.status} ${await mediaResponse.text()}`);
  }

  const media = await mediaResponse.json();
  const statusForm = new URLSearchParams();
  statusForm.set('status', payload.text);
  statusForm.append('media_ids[]', media.id);
  statusForm.set('visibility', 'public');

  const statusResponse = await fetch(new URL('/api/v1/statuses', process.env.MASTODON_BASE_URL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MASTODON_ACCESS_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': stableId(`mastodon:${payload.url}`)
    },
    body: statusForm
  });

  if (!statusResponse.ok) {
    throw new Error(`Mastodon status publish failed: ${statusResponse.status} ${await statusResponse.text()}`);
  }

  const status = await statusResponse.json();
  console.log(`Mastodon post created: ${status.url || status.uri || status.id}`);
}

function stableId(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function git(args) {
  const { execFile } = await import('node:child_process');
  return await new Promise((resolve, reject) => {
    execFile('git', args, { cwd: repoRoot }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
