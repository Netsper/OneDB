import test from 'node:test';
import assert from 'node:assert/strict';
import { parseApiJson } from '../../../../src/hooks/api/useOneDbApi.js';

function mockResponse(status, bodyText) {
  return {
    status,
    text: async () => bodyText,
  };
}

test('parseApiJson parses valid JSON payload', async () => {
  const response = mockResponse(200, ' { "ok": true, "value": 7 } ');
  const parsed = await parseApiJson(response, 'ping');
  assert.deepEqual(parsed, { ok: true, value: 7 });
});

test('parseApiJson returns null for empty payload', async () => {
  const response = mockResponse(204, '   ');
  const parsed = await parseApiJson(response, 'empty_action');
  assert.equal(parsed, null);
});

test('parseApiJson reports HTML responses with contextual message', async () => {
  const response = mockResponse(500, '<!doctype html><html><body>Oops</body></html>');
  await assert.rejects(
    () => parseApiJson(response, 'query'),
    /Server returned HTML instead of JSON for "query" \(HTTP 500\)\./,
  );
});

test('parseApiJson reports invalid JSON responses with snippet', async () => {
  const response = mockResponse(502, 'not-json-content');
  await assert.rejects(
    () => parseApiJson(response, 'list_tables'),
    /Invalid JSON response for "list_tables" \(HTTP 502\)\./,
  );
});
