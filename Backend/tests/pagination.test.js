import test from 'node:test';
import assert from 'node:assert/strict';
import { listSchema, auditSchema } from '../src/validators/gym.schema.js';
import { progressListSchema } from '../src/validators/progress.schema.js';

test('attendance, audit and progress default to ten records with validated offsets', () => {
  for (const schema of [listSchema, auditSchema, progressListSchema]) {
    assert.equal(schema.parse({}).limit, 10);
    assert.equal(schema.parse({ limit: '10', offset: '10' }).offset, 10);
    assert.equal(schema.parse({ limit: '25' }).limit, 25);
    assert.equal(schema.safeParse({ limit: '101' }).success, false);
    assert.equal(schema.safeParse({ offset: '-1' }).success, false);
  }
});
