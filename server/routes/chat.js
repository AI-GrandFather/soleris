import { Router } from 'express';
import OpenAI from 'openai';
import db from '../db.js';

const router = Router();
const WRITING_TOOLS = new Set([
  'add_category',
  'update_category',
  'delete_category',
  'set_total_budget',
  'add_sku',
  'update_sku',
  'split_sku',
  'delete_sku',
  'move_sku',
  'add_expense',
]);

function buildSystemPrompt() {
  const pkrRate = db.prepare("SELECT rate FROM exchange_rates WHERE currency = 'PKR'").get()?.rate || 278.5;

  return `You are the Soleris Ledger AI assistant for a business budgeting dashboard.

Your job is to help users understand their dashboard and make safe changes to the underlying data.

Rules:
- When a user wants a change, make the change with tools when the request is specific enough.
- If a required detail is missing, ask one concise follow-up question instead of guessing.
- Look up IDs with tools before updating or deleting records.
- When talking about money to the user, default to PKR using 1 USD = ${pkrRate} PKR unless the user explicitly asks for another currency.
- Master budget and category budgets are fixed in PKR.
- Expenses and SKU cost fields are stored in USD internally.
- If the user asks to split a SKU, create replacement SKUs and remove the original mixed SKU unless they explicitly ask to keep it.
- Confirm completed changes clearly and concisely.

The dashboard tracks:
- Budget categories and a master total budget
- Expenses
- Inventory SKUs with cost, selling price, shipping, and other unit costs

Today's date: ${new Date().toISOString().slice(0, 10)}`;
}

let cachedClient = null;
const RESPONSE_OPTIONS = {
  reasoning: { effort: 'low' },
};

function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-5-mini-2025-08-07';
}

function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return cachedClient;
}

const tools = [
  {
    type: 'function',
    name: 'get_dashboard_snapshot',
    description: 'Get the current dashboard summary including total budget, categories, spend, and top expense totals.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'get_categories',
    description: 'Get all categories with IDs, budgets, colors, and spend. Use this before category updates or deletions.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'add_category',
    description: 'Create a new dashboard category.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        budget_pkr: { type: 'number' },
        color: { type: 'string' },
      },
      required: ['name', 'budget_pkr'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'update_category',
    description: 'Update an existing category by ID. Only pass the fields that should change.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        budget_pkr: { type: 'number' },
        color: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'delete_category',
    description: 'Delete a category by ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'set_total_budget',
    description: 'Update the master total budget in PKR.',
    parameters: {
      type: 'object',
      properties: {
        value_pkr: { type: 'number' },
      },
      required: ['value_pkr'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_skus',
    description: 'Get all SKUs with IDs, names, categories, quantities, and pricing. Use this before SKU updates or deletions.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    type: 'function',
    name: 'add_sku',
    description: 'Add a new SKU to a category.',
    parameters: {
      type: 'object',
      properties: {
        category_id: { type: 'number' },
        name: { type: 'string' },
        quantity: { type: 'number' },
        unit_price_usd: { type: 'number' },
        selling_price_usd: { type: 'number' },
        shipping_cost_usd: { type: 'number' },
        other_costs_usd: { type: 'number' },
      },
      required: ['category_id', 'name', 'quantity', 'unit_price_usd'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'split_sku',
    description: 'Split one SKU into multiple replacement SKUs and remove the original mixed SKU.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        parts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
            },
            required: ['name', 'quantity'],
            additionalProperties: false,
          },
        },
      },
      required: ['id', 'parts'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'update_sku',
    description: 'Update an existing SKU by ID. Only pass the fields that should change.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        quantity: { type: 'number' },
        unit_price_usd: { type: 'number' },
        selling_price_usd: { type: 'number' },
        shipping_cost_usd: { type: 'number' },
        other_costs_usd: { type: 'number' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'move_sku',
    description: 'Move a SKU up or down within its category order.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        direction: { type: 'string', enum: ['up', 'down'] },
      },
      required: ['id', 'direction'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'delete_sku',
    description: 'Delete a SKU by ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'add_expense',
    description: 'Create a new expense in a category.',
    parameters: {
      type: 'object',
      properties: {
        category_id: { type: 'number' },
        amount_usd: { type: 'number' },
        description: { type: 'string' },
        date: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['category_id', 'amount_usd', 'description'],
      additionalProperties: false,
    },
  },
];

function getCategories() {
  const pkrRate = db.prepare("SELECT rate FROM exchange_rates WHERE currency = 'PKR'").get()?.rate || 278.5;
  return db.prepare(`
    SELECT c.*,
      COALESCE(SUM(e.amount_usd), 0) +
      COALESCE((SELECT SUM(unit_price_usd * quantity) FROM skus WHERE category_id = c.id), 0) AS spent_usd
    FROM categories c
    LEFT JOIN expenses e ON e.category_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at ASC
  `).all().map((category) => ({
    ...category,
    spent_pkr: category.spent_usd * pkrRate,
  }));
}

function getDashboardSnapshot() {
  const categories = getCategories();
  const { total_budget_pkr } = db.prepare(`
    SELECT COALESCE(CAST(value AS REAL), 0) AS total_budget_pkr
    FROM settings
    WHERE key = 'total_budget_pkr'
  `).get() ?? { total_budget_pkr: 0 };
  const pkrRate = db.prepare("SELECT rate FROM exchange_rates WHERE currency = 'PKR'").get()?.rate || 278.5;

  const { total_spent_usd, expense_count } = db.prepare(`
    SELECT
      COALESCE(SUM(amount_usd), 0) AS total_spent_usd,
      COUNT(*) AS expense_count
    FROM expenses
  `).get();

  const { inventory_units, inventory_value_usd } = db.prepare(`
    SELECT
      COALESCE(SUM(quantity), 0) AS inventory_units,
      COALESCE(SUM(unit_price_usd * quantity), 0) AS inventory_value_usd
    FROM skus
  `).get();

  const topCategories = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      budget_pkr: category.budget_pkr,
      spent_usd: category.spent_usd,
      spent_pkr: category.spent_pkr,
      remaining_pkr: Math.max(0, (category.budget_pkr ?? 0) - (category.spent_pkr ?? 0)),
    }))
    .sort((a, b) => b.spent_pkr - a.spent_pkr)
    .slice(0, 5);

  return {
    total_budget_pkr,
    total_spent_usd,
    total_spent_pkr: total_spent_usd * pkrRate,
    total_remaining_pkr: Math.max(0, total_budget_pkr - (total_spent_usd * pkrRate)),
    expense_count,
    inventory_units,
    inventory_value_usd,
    inventory_value_pkr: inventory_value_usd * pkrRate,
    categories,
    top_categories: topCategories,
  };
}

function executeTool(name, args) {
  switch (name) {
    case 'get_dashboard_snapshot':
      return JSON.stringify(getDashboardSnapshot());
    case 'get_categories':
      return JSON.stringify(getCategories());
    case 'add_category': {
      const color = args.color ?? '#C9A030';
      const result = db.prepare(
        'INSERT INTO categories (name, budget_usd, budget_pkr, color) VALUES (?, ?, ?, ?)'
      ).run(args.name.trim(), 0, args.budget_pkr, color);
      const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
      return JSON.stringify({ success: true, category });
    }
    case 'update_category': {
      const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(args.id);
      if (!existing) return JSON.stringify({ error: `Category with id ${args.id} not found` });
      db.prepare(
        'UPDATE categories SET name = ?, budget_pkr = ?, color = ? WHERE id = ?'
      ).run(
        args.name ?? existing.name,
        args.budget_pkr ?? existing.budget_pkr,
        args.color ?? existing.color,
        args.id,
      );
      const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(args.id);
      return JSON.stringify({ success: true, category });
    }
    case 'delete_category': {
      const existing = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(args.id);
      if (!existing) return JSON.stringify({ error: `Category with id ${args.id} not found` });
      db.prepare('DELETE FROM categories WHERE id = ?').run(args.id);
      return JSON.stringify({ success: true, deleted: existing });
    }
    case 'set_total_budget': {
      db.prepare(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('total_budget_pkr', ?)"
      ).run(String(args.value_pkr));
      return JSON.stringify({ success: true, value_pkr: args.value_pkr });
    }
    case 'get_skus': {
      const rows = db.prepare(`
        SELECT
          s.id,
          s.name,
          s.category_id,
          c.name AS category_name,
          s.quantity,
          s.unit_price_usd,
          s.selling_price_usd,
          s.shipping_cost_usd,
          s.other_costs_usd
        FROM skus s
        LEFT JOIN categories c ON c.id = s.category_id
        ORDER BY s.id
      `).all();
      return JSON.stringify(rows);
    }
    case 'add_sku': {
      const result = db.prepare(`
        INSERT INTO skus (
          category_id, name, unit_price_usd, quantity,
          selling_price_usd, shipping_cost_usd, other_costs_usd, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        args.category_id,
        args.name.trim(),
        args.unit_price_usd,
        args.quantity,
        args.selling_price_usd ?? 0,
        args.shipping_cost_usd ?? 0,
        args.other_costs_usd ?? 0,
        '',
      );
      const sku = db.prepare('SELECT * FROM skus WHERE id = ?').get(result.lastInsertRowid);
      return JSON.stringify({ success: true, sku });
    }
    case 'split_sku': {
      const existing = db.prepare('SELECT * FROM skus WHERE id = ?').get(args.id);
      if (!existing) return JSON.stringify({ error: `SKU with id ${args.id} not found` });
      if (!Array.isArray(args.parts) || args.parts.length === 0) {
        return JSON.stringify({ error: 'split parts are required' });
      }

      const { startSortOrder } = db.prepare(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 as startSortOrder FROM skus WHERE category_id = ?'
      ).get(existing.category_id);

      const insert = db.prepare(`
        INSERT INTO skus (
          category_id, name, sort_order, unit_price_usd, quantity,
          selling_price_usd, shipping_cost_usd, other_costs_usd, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const split = db.transaction(() => {
        const created = args.parts.map((part, index) => {
          const result = insert.run(
            existing.category_id,
            part.name.trim(),
            startSortOrder + index,
            existing.unit_price_usd,
            part.quantity,
            existing.selling_price_usd,
            existing.shipping_cost_usd,
            existing.other_costs_usd,
            existing.note ?? '',
          );
          return db.prepare('SELECT * FROM skus WHERE id = ?').get(result.lastInsertRowid);
        });

        db.prepare('DELETE FROM skus WHERE id = ?').run(args.id);
        return created;
      });

      const created = split();
      return JSON.stringify({ success: true, deleted_original_id: args.id, created });
    }
    case 'update_sku': {
      const existing = db.prepare('SELECT * FROM skus WHERE id = ?').get(args.id);
      if (!existing) return JSON.stringify({ error: `SKU with id ${args.id} not found` });
      db.prepare(`
        UPDATE skus
        SET name = ?, unit_price_usd = ?, quantity = ?, selling_price_usd = ?, shipping_cost_usd = ?, other_costs_usd = ?
        WHERE id = ?
      `).run(
        args.name ?? existing.name,
        args.unit_price_usd ?? existing.unit_price_usd,
        args.quantity ?? existing.quantity,
        args.selling_price_usd ?? existing.selling_price_usd,
        args.shipping_cost_usd ?? existing.shipping_cost_usd,
        args.other_costs_usd ?? existing.other_costs_usd,
        args.id,
      );
      const sku = db.prepare('SELECT * FROM skus WHERE id = ?').get(args.id);
      return JSON.stringify({ success: true, sku });
    }
    case 'move_sku': {
      const current = db.prepare('SELECT id, category_id, sort_order FROM skus WHERE id = ?').get(args.id);
      if (!current) return JSON.stringify({ error: `SKU with id ${args.id} not found` });

      const neighbor = args.direction === 'up'
        ? db.prepare(`
            SELECT id, sort_order FROM skus
            WHERE category_id = ? AND sort_order < ?
            ORDER BY sort_order DESC, id DESC
            LIMIT 1
          `).get(current.category_id, current.sort_order)
        : db.prepare(`
            SELECT id, sort_order FROM skus
            WHERE category_id = ? AND sort_order > ?
            ORDER BY sort_order ASC, id ASC
            LIMIT 1
          `).get(current.category_id, current.sort_order);

      if (!neighbor) {
        return JSON.stringify({ success: true, moved: false });
      }

      const move = db.transaction(() => {
        db.prepare('UPDATE skus SET sort_order = ? WHERE id = ?').run(neighbor.sort_order, current.id);
        db.prepare('UPDATE skus SET sort_order = ? WHERE id = ?').run(current.sort_order, neighbor.id);
      });
      move();

      return JSON.stringify({ success: true, moved: true });
    }
    case 'delete_sku': {
      const existing = db.prepare('SELECT id, name FROM skus WHERE id = ?').get(args.id);
      if (!existing) return JSON.stringify({ error: `SKU with id ${args.id} not found` });
      db.prepare('DELETE FROM skus WHERE id = ?').run(args.id);
      return JSON.stringify({ success: true, deleted: existing });
    }
    case 'add_expense': {
      const date = args.date || new Date().toISOString().slice(0, 10);
      const result = db.prepare(`
        INSERT INTO expenses (category_id, amount_usd, description, date, note)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        args.category_id,
        args.amount_usd,
        args.description.trim(),
        date,
        args.note ?? '',
      );
      const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
      return JSON.stringify({ success: true, expense });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function toResponseInput(messages) {
  return messages
    .filter((message) => message?.role === 'user' || message?.role === 'assistant')
    .map((message) => ({
      type: 'message',
      role: message.role,
      content: typeof message.content === 'string' ? message.content : String(message.content ?? ''),
    }));
}

router.post('/', async (req, res) => {
  const client = getClient();

  if (!client) {
    return res.status(503).json({ error: 'OPENAI_API_KEY is missing on the server.' });
  }

  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    let changed = false;
    let response = await client.responses.create({
      ...RESPONSE_OPTIONS,
      model: getModel(),
      instructions: buildSystemPrompt(),
      input: toResponseInput(messages),
      tools,
      tool_choice: 'auto',
    });

    while (true) {
      const toolCalls = response.output.filter((item) => item.type === 'function_call');

      if (!toolCalls.length) {
        const reply = response.output_text?.trim() || 'No response generated.';
        return res.json({
          reply,
          changed,
          messages: [...messages, { role: 'assistant', content: reply }],
        });
      }

      const toolOutputs = toolCalls.map((call) => {
        let args = {};
        try {
          args = call.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          args = {};
        }

        if (WRITING_TOOLS.has(call.name)) {
          changed = true;
        }

        return {
          type: 'function_call_output',
          call_id: call.call_id,
          output: executeTool(call.name, args),
        };
      });

      response = await client.responses.create({
        ...RESPONSE_OPTIONS,
        model: getModel(),
        previous_response_id: response.id,
        input: toolOutputs,
        instructions: buildSystemPrompt(),
        tools,
        tool_choice: 'auto',
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Chat request failed.' });
  }
});

export default router;
