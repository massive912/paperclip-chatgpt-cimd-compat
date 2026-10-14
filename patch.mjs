#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';

const [target, operation] = process.argv.slice(2);
if (!target || ![undefined, '--apply', '--restore'].includes(operation)) {
  console.error('Usage: node patch.mjs <client-metadata.js> [--apply|--restore]');
  process.exit(2);
}

const backup = target + '.cimd-original.bak';
const originalMarker = 'token_endpoint_auth_method: z.literal("none").default("none"),';
const marker = 'Client must support public PKCE token authentication.';
const schemaEnd = /(response_types: z\.array\(z\.literal\("code"\)\)\.default\(\["code"\]\),\s*)\}\);/;

if (operation === '--restore') {
  if (!existsSync(backup)) throw new Error('Original backup missing');
  if (!existsSync(target) || !readFileSync(target, 'utf8').includes(marker)) {
    throw new Error('Target differs from expected patch; refusing restore');
  }
  copyFileSync(backup, target);
  console.log('Restored original. Restart Paperclip.');
  process.exit(0);
}

if (!existsSync(target)) throw new Error('Target file missing');
const input = readFileSync(target, 'utf8');
if (input.includes(marker)) {
  console.log('Already patched; no changes.');
  process.exit(0);
}
if (input.split(originalMarker).length !== 2 || !schemaEnd.test(input)) {
  throw new Error('Unrecognized Paperclip version/layout; refusing patch');
}
let output = input.replace(originalMarker,
  'token_endpoint_auth_method: z.string().min(1).max(100).default("none"),\n' +
  '    token_endpoint_auth_methods_supported: z.array(z.string().min(1).max(100)).max(20).optional(),');
output = output.replace(schemaEnd,
  '$1}).refine(metadata => metadata.token_endpoint_auth_methods_supported ? metadata.token_endpoint_auth_methods_supported.includes("none") : metadata.token_endpoint_auth_method === "none", { message: "Client must support public PKCE token authentication." }).transform(metadata => ({ ...metadata, token_endpoint_auth_method: "none" }));');
if (!output.includes(marker)) throw new Error('Patch generation failed');

if (!operation) {
  console.log('Dry run passed; no changes.');
  console.log('Apply: node patch.mjs "' + target + '" --apply');
  process.exit(0);
}
if (existsSync(backup)) throw new Error('Existing backup present; refusing overwrite');
copyFileSync(target, backup);
writeFileSync(target, output, 'utf8');
console.log('Applied patch; original saved at ' + backup + '. Restart Paperclip.');
