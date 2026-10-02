import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../dist/', import.meta.url);

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    assert(!entry.isSymbolicLink(), 'The public build must not contain symlinks.');
    assert(!/reference.*\.(mp4|mov|webm)$/i.test(entry.name), 'Reference footage must not be deployed.');
    if (entry.isDirectory()) await inspect(url);
    else if (/\.(js|html)$/.test(entry.name)) {
      const source = await readFile(url, 'utf8');
      assert(!source.includes('reference.mp4'), 'The public build must not link to the reference video.');
      assert(!source.includes('Compare with reference'), 'The public build must not expose reference controls.');
    }
  }
}

await readFile(new URL('index.html', root), 'utf8');
await inspect(root);
console.log('Public build is shader-only; reference media and controls are excluded.');
