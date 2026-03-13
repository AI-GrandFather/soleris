/**
 * Integration tests for SKU API routes.
 * Covers the three new features: marketing_cost_usd column,
 * PATCH /reorder endpoint, and sort_order persistence.
 *
 * Uses a temp SQLite file so the production DB is never touched.
 * DATABASE_PATH must be set before any imports that pull in db.js.
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

// Set test DB path before anything imports db.js
const TEST_DB = join(tmpdir(), `soleris-test-skus-${Date.now()}.db`);
process.env.DATABASE_PATH = TEST_DB;

// Dynamic imports happen after env var is set so db.js uses TEST_DB
const express = (await import('express')).default;
const { default: skusRouter } = await import('../routes/skus.js');

// Minimal test app — only the SKU router, no chat/openai deps
const app = express();
app.use(express.json());
app.use('/api/skus', skusRouter);

let server;
let baseUrl;
let testCategoryId;

// Insert a category row directly via the same db singleton the router uses
const { default: db } = await import('../db.js');

before(async () => {
  // Insert a test category so we have a valid category_id
  const result = db.prepare(
    'INSERT INTO categories (name, budget_usd, budget_pkr, color) VALUES (?, ?, ?, ?)'
  ).run('Test Category', 0, 0, '#FF0000');
  testCategoryId = result.lastInsertRowid;

  // Start the test server on a random port
  await new Promise((resolve) => {
    server = createServer(app);
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  try { rmSync(TEST_DB); } catch { /* ok if already gone */ }
  try { rmSync(`${TEST_DB}-shm`); } catch {}
  try { rmSync(`${TEST_DB}-wal`); } catch {}
});

async function req(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

describe('Marketing cost column', () => {
  test('POST /api/skus includes marketing_cost_usd defaulting to 0', async () => {
    const { status, body } = await req('POST', '/api/skus', {
      category_id: testCategoryId,
      name: 'Test SKU',
      unit_price_usd: 10,
      quantity: 5,
    });
    assert.equal(status, 201);
    assert.equal(body.marketing_cost_usd, 0, 'marketing_cost_usd should default to 0');
  });

  test('POST /api/skus with explicit marketing_cost_usd persists it', async () => {
    const { status, body } = await req('POST', '/api/skus', {
      category_id: testCategoryId,
      name: 'Marketed SKU',
      unit_price_usd: 20,
      quantity: 2,
      marketing_cost_usd: 3.5,
    });
    assert.equal(status, 201);
    assert.equal(body.marketing_cost_usd, 3.5);
  });

  test('PUT /api/skus/:id updates marketing_cost_usd', async () => {
    const { body: created } = await req('POST', '/api/skus', {
      category_id: testCategoryId,
      name: 'Update Test SKU',
      unit_price_usd: 15,
      quantity: 1,
      marketing_cost_usd: 0,
    });

    const { status, body: updated } = await req('PUT', `/api/skus/${created.id}`, {
      name: 'Update Test SKU',
      unit_price_usd: 15,
      quantity: 1,
      marketing_cost_usd: 2.0,
    });
    assert.equal(status, 200);
    assert.equal(updated.marketing_cost_usd, 2.0);
  });

  test('PUT /api/skus/:id without marketing_cost_usd preserves existing value', async () => {
    const { body: created } = await req('POST', '/api/skus', {
      category_id: testCategoryId,
      name: 'Preserve Test SKU',
      unit_price_usd: 10,
      quantity: 1,
      marketing_cost_usd: 5.0,
    });

    // Omit marketing_cost_usd from PUT body (SkuPlanner does this)
    const { status, body: updated } = await req('PUT', `/api/skus/${created.id}`, {
      name: 'Preserve Test SKU',
      unit_price_usd: 10,
      quantity: 2,
      // marketing_cost_usd intentionally absent
    });
    assert.equal(status, 200);
    assert.equal(updated.marketing_cost_usd, 5.0, 'marketing_cost_usd must be preserved when absent from PUT body');
  });

  test('GET /api/skus returns marketing_cost_usd for all SKUs', async () => {
    const { status, body } = await req('GET', `/api/skus?category_id=${testCategoryId}`);
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    for (const sku of body) {
      assert.ok('marketing_cost_usd' in sku, `SKU ${sku.id} is missing marketing_cost_usd`);
    }
  });
});

describe('PATCH /api/skus/reorder', () => {
  let skuIds;

  before(async () => {
    // Create fresh SKUs with known sort_order for reorder tests
    const catResult = db.prepare(
      'INSERT INTO categories (name, budget_usd, budget_pkr, color) VALUES (?, ?, ?, ?)'
    ).run('Reorder Category', 0, 0, '#00FF00');
    const catId = catResult.lastInsertRowid;

    const a = await req('POST', '/api/skus', { category_id: catId, name: 'SKU A', unit_price_usd: 1, quantity: 1 });
    const b = await req('POST', '/api/skus', { category_id: catId, name: 'SKU B', unit_price_usd: 1, quantity: 1 });
    const c = await req('POST', '/api/skus', { category_id: catId, name: 'SKU C', unit_price_usd: 1, quantity: 1 });
    skuIds = [a.body.id, b.body.id, c.body.id];
  });

  test('PATCH /api/skus/reorder accepts ordered_ids and returns ok', async () => {
    const reversed = [...skuIds].reverse();
    const { status, body } = await req('PATCH', '/api/skus/reorder', { ordered_ids: reversed });
    assert.equal(status, 200);
    assert.equal(body.ok, true);
  });

  test('sort_order values are renumbered 1,2,3 after reorder', async () => {
    const reversed = [...skuIds].reverse(); // [C, B, A]
    await req('PATCH', '/api/skus/reorder', { ordered_ids: reversed });

    const rows = db.prepare('SELECT id, sort_order FROM skus WHERE id IN (?, ?, ?) ORDER BY sort_order ASC')
      .all(...skuIds);

    assert.deepEqual(
      rows.map(r => r.sort_order),
      [1, 2, 3],
      'sort_order should be sequential integers after reorder'
    );
    assert.deepEqual(
      rows.map(r => r.id),
      reversed,
      'rows should appear in the requested order'
    );
  });

  test('PATCH /api/skus/reorder rejects empty ordered_ids', async () => {
    const { status, body } = await req('PATCH', '/api/skus/reorder', { ordered_ids: [] });
    assert.equal(status, 400);
    assert.ok(body.error);
  });

  test('PATCH /api/skus/reorder rejects missing ordered_ids', async () => {
    const { status, body } = await req('PATCH', '/api/skus/reorder', {});
    assert.equal(status, 400);
    assert.ok(body.error);
  });
});

describe('DB schema', () => {
  test('skus table has marketing_cost_usd column', () => {
    const cols = db.prepare("PRAGMA table_info(skus)").all();
    const names = cols.map(c => c.name);
    assert.ok(names.includes('marketing_cost_usd'), 'marketing_cost_usd column must exist in skus table');
  });

  test('marketing_cost_usd has default value of 0', () => {
    const cols = db.prepare("PRAGMA table_info(skus)").all();
    const col = cols.find(c => c.name === 'marketing_cost_usd');
    assert.ok(col, 'marketing_cost_usd column not found');
    assert.equal(col.dflt_value, '0', 'default value must be 0');
  });

  test('skus table has sort_order column', () => {
    const cols = db.prepare("PRAGMA table_info(skus)").all();
    const names = cols.map(c => c.name);
    assert.ok(names.includes('sort_order'), 'sort_order column must exist in skus table');
  });
});
