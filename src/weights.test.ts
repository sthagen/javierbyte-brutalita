import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  editorStrokeWidth,
  parseWeight,
  SHIPPED_WEIGHTS,
  strokeFraction,
  styleName,
} from './weights';

// The committed public/font/*.otf and brutalita-cover.svg are compared byte for
// byte elsewhere, which only holds if an anchor weight returns its exact value.
test('the anchor weights keep their exact hand-tuned values', () => {
  assert.equal(strokeFraction(300), 0.15);
  assert.equal(strokeFraction(400), 0.25);
  assert.equal(strokeFraction(700), 0.3);

  assert.equal(editorStrokeWidth(300), 1.5);
  assert.equal(editorStrokeWidth(400), 2);
  assert.equal(editorStrokeWidth(700), 2.5);
});

test('weights between anchors interpolate', () => {
  const close = (actual: number, expected: number) =>
    assert.ok(
      Math.abs(actual - expected) < 1e-9,
      `${actual} is not within 1e-9 of ${expected}`
    );

  // A third of the way from 400 to 700.
  close(strokeFraction(500), 0.25 + (0.3 - 0.25) / 3);
  close(editorStrokeWidth(500), 2 + (2.5 - 2) / 3);

  // Halfway from 300 to 400.
  assert.equal(strokeFraction(350), 0.2);
  assert.equal(editorStrokeWidth(350), 1.75);

  // Monotonic across the whole range.
  let previous = 0;
  for (let weight = 100; weight <= 900; weight += 25) {
    assert.ok(strokeFraction(weight) >= previous);
    previous = strokeFraction(weight);
  }
});

test('weights outside the anchors clamp to the nearest', () => {
  assert.equal(strokeFraction(100), strokeFraction(300));
  assert.equal(strokeFraction(900), strokeFraction(700));
  assert.equal(editorStrokeWidth(1), editorStrokeWidth(300));
  assert.equal(editorStrokeWidth(1000), editorStrokeWidth(700));
});

test('styleName uses the standard names, else the weight itself', () => {
  assert.equal(styleName({ weight: 300 }), 'Light');
  assert.equal(styleName({ weight: 400 }), 'Regular');
  assert.equal(styleName({ weight: 500 }), 'Medium');
  assert.equal(styleName({ weight: 700 }), 'Bold');
  assert.equal(styleName({ weight: 550 }), '550');
  assert.equal(styleName({ weight: 550, styleName: 'SemiMedium' }), 'SemiMedium');
  // A blank override falls back rather than naming the font "".
  assert.equal(styleName({ weight: 400, styleName: '  ' }), 'Regular');
});

test('parseWeight rounds, range-checks and rejects non-numbers', () => {
  assert.equal(parseWeight(400), 400);
  assert.equal(parseWeight('550'), 550);
  assert.equal(parseWeight(1), 1);
  assert.equal(parseWeight(1000), 1000);
  assert.equal(parseWeight(412.6), 413);

  for (const bad of [0, 1001, -400, 'heavy', '', null, undefined, NaN, {}]) {
    assert.equal(parseWeight(bad), null, `expected ${JSON.stringify(bad)} to fail`);
  }
});

test('every shipped weight has a standard name', () => {
  for (const weight of SHIPPED_WEIGHTS) {
    assert.notEqual(styleName({ weight }), String(weight));
  }
});
