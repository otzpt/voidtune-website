/**
 * Run: node --experimental-strip-types src/scenes/pcLayout.test.ts
 *
 * Guards the two things about this layout data that fail silently rather than
 * loudly: an invalid colour string (three.js parses it to black and renders a
 * black box on a black background), and a disassembly step naming a part that
 * does not exist (the step then removes nothing and the sequence looks broken
 * with no error anywhere).
 */
import assert from 'node:assert/strict';
import { DISASSEMBLY, PARTS, PART_TO_COMPONENT } from './pcLayout.ts';

const HEX = /^#[0-9a-fA-F]{6}$/;
const ids = new Set(PARTS.map((part) => part.id));

for (const part of PARTS) {
  assert.match(part.color, HEX, `${part.id} has an invalid colour: ${part.color}`);
  assert.equal(part.size.length, 3, `${part.id} size must be [x,y,z]`);
  assert.ok(
    part.size.every((value) => value > 0),
    `${part.id} has a non-positive dimension`,
  );
}

for (const step of DISASSEMBLY) {
  for (const partId of step.parts) {
    assert.ok(ids.has(partId), `step ${step.index} removes unknown part "${partId}"`);
  }
}

// Each step must remove everything the previous one did: the sequence is
// cumulative, so a part reappearing mid-teardown is a data bug.
for (let i = 1; i < DISASSEMBLY.length; i++) {
  const previous = new Set(DISASSEMBLY[i - 1].parts);
  for (const partId of previous) {
    assert.ok(
      DISASSEMBLY[i].parts.includes(partId),
      `step ${i} lost "${partId}" that step ${i - 1} had already removed`,
    );
  }
}

for (const [alias, target] of Object.entries(PART_TO_COMPONENT)) {
  assert.ok(ids.has(alias), `PART_TO_COMPONENT maps unknown part "${alias}"`);
  assert.ok(target.length > 0, `${alias} maps to an empty component id`);
}

console.log(`ok — ${PARTS.length} parts, ${DISASSEMBLY.length} steps validated`);
