import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('golden: initial document paint', () => {
  it('sets the dark canvas background before bundles load', () => {
    for (const file of ['client/index.html', 'index.html']) {
      const html = readFileSync(resolve(process.cwd(), file), 'utf8');

      expect(html).toContain('<style data-critical-paint>');
      expect(html).toContain('html,body{margin:0;background:#0F172A}');
    }
  });
});
