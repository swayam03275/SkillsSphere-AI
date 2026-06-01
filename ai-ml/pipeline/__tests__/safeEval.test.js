import assert from 'node:assert';
import { describe, it } from 'node:test';
import { safeEval } from '../safeEval.js';

describe('safeEval', () => {
  it('validates and returns evaluated result on success', async () => {
    const fn = async () => ({ score: 90, details: { ok: true } });
    const validate = (obj) => ({ ...obj, validated: true });
    const res = await safeEval('testEval', fn, validate);
    assert.equal(res.name, 'testEval');
    assert.equal(res.score, 90);
    assert.equal(res.validated, true);
  });

  it('returns fallback on evaluator throw', async () => {
    const fn = async () => { throw new Error('boom'); };
    const validate = () => { throw new Error('should not be called'); };
    const fallback = { score: 0, error: true };
    const res = await safeEval('failingEval', fn, validate, fallback);
    assert.equal(res.name, 'failingEval');
    assert.equal(res.score, 0);
    assert.equal(res.error, true);
  });

  it('returns fallback when validation throws', async () => {
    const fn = async () => ({ score: 55 });
    const validate = () => { throw new Error('validation failed'); };
    const res = await safeEval('badValidate', fn, validate);
    assert.equal(res.name, 'badValidate');
    assert.equal(res.weightedScore, 0);
  });
});
