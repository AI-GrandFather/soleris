import { Router } from 'express';
import OpenAI from 'openai';
import db from '../db.js';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'gpt-5-mini-2025-08-07';

const SYSTEM_PROMPT = `You are a helpful assistant for Soleris Ledger, a business budget and profit tracking app.

You help users manage their inventory SKUs, expenses, and budget categories.

When users ask to make changes, use the available tools to look up IDs first, then execute the changes.
If you need more information before proceeding (e.g., unit price for a new SKU, which category to use), ask the user.
After making changes, confirm what was done clearly and concisely.

All monetary amounts are in USD internally. The app supports USD, CNY, and PKR display.
Today's date: ${new Date().toISOString().split('T')[0]}`;

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_skus',
      description: 'Get all SKUs with their IDs, names, categories, quantities, and prices. Use this to look up SKU IDs before updating.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_categories',
      description: 'Get all budget categories with their IDs, names, and budgets. Use this to look up category IDs.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_sku',
      description: 'Update an existing SKU. Only provide fields you want to change.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'SKU ID (required)' },
          name: { type: 'string', description: 'New name' },
          quantity: { type: 'number', description: 'New quantity' },
          unit_price_usd: { type: 'number', description: 'New unit cost in USD' },
          selling_price_usd: { type: 'number', description: 'New selling price in USD' },
          shipping_cost_usd: { type: 'number', description: 'New shipping cost per unit in USD' },
          other_costs_usd: { type: 'number', description: 'Other costs per unit in USD' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_sku',
      description: 'Add a new SKU to a category.',
      parameters: {
        type: 'object',
        properties: {
          category_id: { type: 'number', description: 'Category ID to add SKU to' },
          name: { type: 'string', description: 'SKU name' },
          quantity: { type: 'number', description: 'Quantity' },
          unit_price_usd: { type: 'number', description: 'Unit cost in USD' },
          selling_price_usd: { type: 'number', description: 'Selling price in USD' },
          shipping_cost_usd: { type: 'number', description: 'Shipping cost per unit in USD' },
        },
        required: ['category_id', 'name', 'quantity', 'unit_price_usd'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_sku',
      description: 'Delete a SKU by ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'SKU ID to delete' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_expense',
      description: 'Log an expense to a budget category.',
      parameters: {
        type: 'object',
        properties: {
          category_id: { type: 'number', description: 'Category ID' },
          amount_usd: { type: 'number', description: 'Amount in USD' },
          description: { type: 'string', description: 'Expense description' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD format (omit for today)' },
          note: { type: 'string', description: 'Optional note' },
        },
        required: ['category_id', 'amount_usd', 'description'],
      },
    },
  },
];

function executeTool(name, args) {
  switch (name) {
    case 'get_skus': {
      const rows = db.prepare(
        'SELECT s.id, s.name, s.category_id, c.name as category_name, s.quantity, s.unit_price_usd, s.selling_price_usd, s.shipping_cost_usd, s.other_costs_usd FROM skus s LEFT JOIN categories c ON s.category_id = c.id ORDER BY s.id'
      ).all();
      return JSON.stringify(rows);
    }
    case 'get_categories': {
      const rows = db.prepare('SELECT id, name, budget_usd FROM categories ORDER BY id').all();
      return JSON.stringify(rows);
    }
    case 'update_sku': {
      const existing = db.prepare('SELECT * FROM skus WHERE id = ?').get(args.id);
      if (!existing) return JSON.stringify({ error: `SKU with id ${args.id} not found` });
      db.prepare(
        'UPDATE skus SET name = ?, unit_price_usd = ?, quantity = ?, selling_price_usd = ?, shipping_cost_usd = ?, other_costs_usd = ? WHERE id = ?'
      ).run(
        args.name ?? existing.name,
        args.unit_price_usd ?? existing.unit_price_usd,
        args.quantity ?? existing.quantity,
        args.selling_price_usd ?? existing.selling_price_usd,
        args.shipping_cost_usd ?? existing.shipping_cost_usd,
        args.other_costs_usd ?? existing.other_costs_usd,
        args.id,
      );
      const updated = db.prepare('SELECT * FROM skus WHERE id = ?').get(args.id);
      return JSON.stringify({ success: true, sku: updated });
    }
    case 'add_sku': {
      const result = db.prepare(
        'INSERT INTO skus (category_id, name, unit_price_usd, quantity, selling_price_usd, shipping_cost_usd, other_costs_usd, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        args.category_id, args.name,
        args.unit_price_usd, args.quantity,
        args.selling_price_usd ?? 0,
        args.shipping_cost_usd ?? 0,
        args.other_costs_usd ?? 0,
        '',
      );
      const row = db.prepare('SELECT * FROM skus WHERE id = ?').get(result.lastInsertRowid);
      return JSON.stringify({ success: true, sku: row });
    }
    case 'delete_sku': {
      const existing = db.prepare('SELECT id, name FROM skus WHERE id = ?').get(args.id);
      if (!existing) return JSON.stringify({ error: `SKU with id ${args.id} not found` });
      db.prepare('DELETE FROM skus WHERE id = ?').run(args.id);
      return JSON.stringify({ success: true, deleted: existing });
    }
    case 'add_expense': {
      const date = args.date || new Date().toISOString().split('T')[0];
      const result = db.prepare(
        'INSERT INTO expenses (category_id, amount_usd, description, date, note) VALUES (?, ?, ?, ?, ?)'
      ).run(args.category_id, args.amount_usd, args.description, date, args.note ?? '');
      const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
      return JSON.stringify({ success: true, expense: row });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });

    let msgs = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
    let changed = false;

    // Agentic loop: keep calling until no tool_calls in response
    while (true) {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: msgs,
        tools,
        tool_choice: 'auto',
      });

      const message = completion.choices[0].message;
      msgs.push(message);

      if (!message.tool_calls?.length) {
        // Final text response — strip system message before returning
        return res.json({ reply: message.content, changed, messages: msgs.slice(1) });
      }

      // Execute each tool call and collect results
      for (const call of message.tool_calls) {
        const args = JSON.parse(call.function.arguments);
        const result = executeTool(call.function.name, args);
        const writingTools = ['update_sku', 'add_sku', 'delete_sku', 'add_expense'];
        if (writingTools.includes(call.function.name)) changed = true;
        msgs.push({ role: 'tool', tool_call_id: call.id, content: result });
      }
    }
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
