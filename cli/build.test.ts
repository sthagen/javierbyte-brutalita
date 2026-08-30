import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import Opentype from 'opentype.js';

import {
  buildFont,
  fontDisplayName,
  fontFileName,
  STYLE_NAME_BY_WEIGHT,
  SUPPORTED_WEIGHTS,
} from '../src/font-maker';
import { validateFontSource } from '../src/font-validate';
import source from '../src/font.json';

import { stampTimestamps } from './otf-deterministic';
import { renderFilename, resolveWeights, slugify } from './source';

// Everything about a font that a build must reproduce exactly. head.created and
// head.modified are deliberately excluded: opentype.js stamps them with the
// current time, so raw bytes differ between runs (see otf-deterministic.ts).
function normalize(font: Opentype.Font) {
  const names = font.names as unknown as Record<
    string,
    Record<string, Record<string, string>>
  >;
  const glyphs = [];
  for (let i = 0; i < font.glyphs.length; i++) {
    const glyph = font.glyphs.get(i);
    glyphs.push({
      name: glyph.name,
      unicode: glyph.unicode ?? null,
      advanceWidth: glyph.advanceWidth,
      // Rounded because the CFF round-trip stores coordinates as integers.
      path: glyph.path.commands.map((command) =>
        JSON.stringify(
          Object.fromEntries(
            Object.entries(command).map(([key, value]) => [
              key,
              typeof value === 'number' ? Math.round(value) : value,
            ])
          )
        )
      ),
    });
  }
  return {
    family: names.unicode?.fontFamily?.en,
    style: names.unicode?.fontSubfamily?.en,
    designer: names.unicode?.designer?.en,
    unitsPerEm: font.unitsPerEm,
    ascender: font.ascender,
    descender: font.descender,
    weightClass: font.tables.os2?.usWeightClass,
    glyphs,
  };
}

function parse(bytes: Buffer | ArrayBuffer): Opentype.Font {
  const buffer = Buffer.isBuffer(bytes)
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : bytes;
  return Opentype.parse(buffer);
}

const { config, chars } = validateFontSource(source);

// The committed public/font/Brutalita-*.otf files are the reference: if a
// refactor moves an outline or an advance width, this fails.
for (const weight of SUPPORTED_WEIGHTS) {
  const style = STYLE_NAME_BY_WEIGHT[weight];
  test(`build reproduces public/font/Brutalita-${style}.otf`, () => {
    const built = buildFont(chars, { ...config, weight });
    const reference = parse(readFileSync(`public/font/Brutalita-${style}.otf`));
    assert.deepEqual(normalize(parse(built.toArrayBuffer())), normalize(reference));
  });
}

// Sources exported before config.version existed must keep working untouched:
// the field is optional, so they validate without complaint and opentype.js
// supplies its own default for name ID 5.
test('a font source predating config.version still validates and builds', () => {
  const legacy = {
    config: {
      name: 'Brutalita v0.8',
      weight: 400,
      height: 1.888,
      monospace: false,
      designer: 'javierbyte',
      designerURL: 'https://javier.xyz',
    },
    chars: source.chars,
  };

  const result = validateFontSource(legacy);
  assert.ok(result.ok);
  // Specifically not an "unknown config key" warning, and not a missing-field error.
  assert.deepEqual(
    result.warnings.filter((issue) => issue.field?.startsWith('config')),
    []
  );
  assert.equal(result.config.version, undefined);

  const built = parse(buildFont(result.chars, result.config).toArrayBuffer());
  const names = built.names as unknown as Record<
    string,
    Record<string, Record<string, string>>
  >;
  assert.equal(names.unicode.fontFamily.en, 'Brutalita v0.8');
  assert.equal(names.unicode.version.en, 'Version 0.1');
  assert.equal(built.glyphs.length, Object.keys(result.chars).length + 1);
});

// ...and a versionless config still names its files, so `brutalita build` with
// the default --filename template does not emit "Brutalita-undefined.otf".
test('filenames and display names survive a missing version', () => {
  const legacy = { ...config, version: undefined };
  assert.equal(fontFileName(legacy), 'Brutalita-Regular.otf');
  assert.equal(fontDisplayName(legacy), 'Brutalita');
  assert.equal(fontDisplayName(config), 'Brutalita v0.800');
});

test('the same source and timestamp produce identical bytes', () => {
  const bytes = (): Buffer =>
    stampTimestamps(
      Buffer.from(
        buildFont(chars, config, { createdTimestamp: 1704067200 }).toArrayBuffer()
      ),
      1704067200
    );
  assert.deepEqual(bytes(), bytes());
});

test('stampTimestamps keeps the font parseable and its checksums valid', () => {
  const stamped = stampTimestamps(
    Buffer.from(buildFont(chars, config).toArrayBuffer()),
    1704067200
  );

  const font = parse(stamped);
  assert.equal(font.glyphs.length, Object.keys(chars).length + 1);

  // A valid font sums to the magic constant once checkSumAdjustment is zeroed.
  const numTables = stamped.readUInt16BE(4);
  let headOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16;
    if (stamped.readUInt32BE(record) === 0x68656164) {
      headOffset = stamped.readUInt32BE(record + 8);
    }
  }
  assert.notEqual(headOffset, -1);

  const zeroed = Buffer.from(stamped);
  zeroed.writeUInt32BE(0, headOffset + 8);
  let sum = 0;
  for (let i = 0; i < zeroed.length; i += 4) {
    let word = 0;
    for (let j = 0; j < 4; j++) {
      word = (word << 8) | (i + j < zeroed.length ? zeroed[i + j] : 0);
    }
    sum = (sum + (word >>> 0)) >>> 0;
  }
  assert.equal(
    stamped.readUInt32BE(headOffset + 8),
    (0xb1b0afba - sum) >>> 0
  );

  // Both date fields land on the requested instant (LONGDATETIME is 1904-based).
  const expected = BigInt(1704067200 + 2082844800);
  assert.equal(stamped.readBigInt64BE(headOffset + 20), expected);
  assert.equal(stamped.readBigInt64BE(headOffset + 28), expected);
});

test('resolveWeights handles lists, "all" and the default', () => {
  assert.deepEqual(resolveWeights(undefined, 700), [700]);
  assert.deepEqual(resolveWeights('all', 400), [300, 400, 700]);
  assert.deepEqual(resolveWeights('700,300', 400), [700, 300]);
  assert.deepEqual(resolveWeights('400,400', 400), [400]);
  assert.throws(() => resolveWeights('500', 400), /--weight must be one of/);
});

test('renderFilename expands every token', () => {
  const mono = { ...config, name: 'My Font', monospace: true, weight: 700 as const };
  assert.equal(
    renderFilename('{name}-{style}.{ext}', mono, 'Bold', 'otf'),
    'My Font Mono-Bold.otf'
  );
  assert.equal(
    renderFilename('{slug}-{weight}{mono}.{ext}', mono, 'Bold', 'otf'),
    'my-font-mono-700Mono.otf'
  );
  assert.throws(() => renderFilename('{nope}.otf', mono, 'Bold', 'otf'), /unknown token/);
  assert.throws(() => renderFilename('a/b.otf', mono, 'Bold', 'otf'), /not a path/);
});

test('slugify produces a filesystem-safe name', () => {
  assert.equal(slugify('Brutalita v0.8'), 'brutalita-v0-8');
  assert.equal(slugify('Bórquez  Mono'), 'borquez-mono');
  assert.equal(slugify('!!!'), 'font');
});
