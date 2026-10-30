#!/usr/bin/env node
// Step 2 of post-generator as code: one UTM-tagged link per platform.
// URL handles the parts a model gets wrong: an existing ?query, encoding, and & versus ?.
import fs from 'node:fs';

const campaign = JSON.parse(fs.readFileSync('campaign.json', 'utf8'));
const links = {};
for (const platform of campaign.platforms) {
  const url = new URL(campaign.url);
  url.searchParams.set('utm_source', platform.key);
  url.searchParams.set('utm_medium', campaign.utm.medium);
  url.searchParams.set('utm_campaign', campaign.utm.campaign);
  links[platform.key] = url.href;
}
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/2-links.json', JSON.stringify(links, null, 2) + '\n');
console.log('Wrote out/2-links.json');
