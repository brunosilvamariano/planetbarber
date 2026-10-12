const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');
const source = ts.transpileModule(
  readFileSync(resolve(__dirname, '../src/lib/master-analytics.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const context = { exports: {} };
new Function('exports', 'module', source)(context.exports, context);
const { masterAnalytics } = context.exports;
const now = new Date('2026-01-15T12:00:00Z');

test('MRR excludes suspended subscriptions and Enterprise contracts without price', () => {
  const result = masterAnalytics([
    { status: 'ACTIVE', createdAt: '2025-12-31T12:00:00Z', plan: { code: 'PRO', priceCents: 9900 } },
    { status: 'SUSPENDED', createdAt: '2026-01-01T00:00:00Z', plan: { code: 'START', priceCents: 4900 } },
    { status: 'ACTIVE', createdAt: '2026-01-10T00:00:00Z', plan: { code: 'ENTERPRISE', priceCents: null } },
  ], 6, now);
  assert.equal(result.mrr, 9900);
  assert.equal(result.plans[0].revenue, 0);
  assert.equal(result.plans[0].companies, 1);
  assert.equal(result.plans[3].revenue, 0);
  assert.equal(result.plans[3].companies, 1);
  assert.equal(result.acquisition.at(-1).value, 2);
  assert.equal(result.acquisition.at(-2).value, 1);
});

test('an empty platform and missing creation dates never manufacture growth', () => {
  const empty = masterAnalytics([], 12, now);
  assert.equal(empty.mrr, 0);
  assert.equal(empty.acquisition.length, 12);
  assert.equal(empty.acquisition.every((point) => point.value === 0), true);
  const missing = masterAnalytics([{ status: 'ACTIVE', plan: { code: 'PRO', priceCents: 9900 } }], 6, now);
  assert.equal(missing.missingDates, true);
  assert.equal(missing.acquisition.every((point) => point.value === 0), true);
});
