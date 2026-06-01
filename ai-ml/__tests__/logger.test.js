import assert from 'node:assert';
import { describe, it } from 'node:test';
import logger from '../utils/logger.js';

describe('logger.redact', () => {
  it('redacts tokens and secrets from strings', () => {
    const input = "User token=supersecrettoken and password=hunter2";
    const out = logger.redact(input);
    assert.ok(out.includes('token=<redacted>'));
    assert.ok(out.includes('password=<redacted>'));
  });

  it('returns non-string inputs unchanged', () => {
    assert.equal(logger.redact(null), null);
    assert.equal(logger.redact(undefined), undefined);
    assert.equal(logger.redact(123), 123);
  });
});
