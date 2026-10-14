import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const patch = fileURLToPath(new URL('../patch.mjs', import.meta.url));
const fixture = 'const metadataSchema = z.object({\n    token_endpoint_auth_method: z.literal("none").default("none"),\n    response_types: z.array(z.literal("code")).default(["code"]),\n});\n';
function invoke(path, flag) {
  const result = spawnSync(process.execPath, [patch, path, ...(flag ? [flag] : [])], { encoding: 'utf8' });
  return result;
}
function withTemp(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'paperclip-cimd-'));
  try {
    const target = join(dir, 'client-metadata.js');
    writeFileSync(target, fixture);
    fn(target);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test('dry run leaves source unchanged', () => withTemp(target => {
  assert.equal(invoke(target).status, 0);
  assert.equal(readFileSync(target, 'utf8'), fixture);
  assert.equal(existsSync(target + '.cimd-original.bak'), false);
}));
test('apply preserves original and emits guarded public-PKCE schema', () => withTemp(target => {
  assert.equal(invoke(target, '--apply').status, 0);
  const changed = readFileSync(target, 'utf8');
  assert.match(changed, /token_endpoint_auth_methods_supported/);
  assert.match(changed, /includes\("none"\)/);
  assert.match(changed, /Client must support public PKCE token authentication/);
  assert.equal(readFileSync(target + '.cimd-original.bak', 'utf8'), fixture);
  assert.equal(invoke(target, '--apply').status, 0);
  assert.equal(invoke(target, '--restore').status, 0);
  assert.equal(readFileSync(target, 'utf8'), fixture);
}));
test('refuses unknown source layout', () => withTemp(target => {
  writeFileSync(target, 'unknown source');
  assert.notEqual(invoke(target, '--apply').status, 0);
  assert.equal(existsSync(target + '.cimd-original.bak'), false);
}));
