import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'budget.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    budget_usd REAL NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#C9A030',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    amount_usd REAL NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exchange_rates (
    currency TEXT PRIMARY KEY,
    rate REAL NOT NULL,
    is_override INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS skus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    unit_price_usd REAL NOT NULL DEFAULT 0,
    quantity REAL NOT NULL DEFAULT 1,
    selling_price_usd REAL NOT NULL DEFAULT 0,
    shipping_cost_usd REAL NOT NULL DEFAULT 0,
    other_costs_usd REAL NOT NULL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );
`);

// Migrate: add profit columns to skus for existing installs
['selling_price_usd', 'shipping_cost_usd', 'other_costs_usd'].forEach(col => {
  try { db.exec(`ALTER TABLE skus ADD COLUMN ${col} REAL NOT NULL DEFAULT 0`); } catch { /* exists */ }
});

// Seed default categories
const { count: catCount } = db.prepare('SELECT COUNT(*) as count FROM categories').get();
if (catCount === 0) {
  const insert = db.prepare('INSERT INTO categories (name, budget_usd, color) VALUES (?, ?, ?)');
  const seedAll = db.transaction(() => {
    insert.run('Inventory', 0, '#C9A030');
    insert.run('Advertising', 0, '#E8802A');
    insert.run('PR & Marketing', 0, '#4BA36C');
    insert.run('Operations', 0, '#4878B0');
    insert.run('Shipping', 0, '#16A3A3');
    insert.run('Miscellaneous', 0, '#8B5CF6');
  });
  seedAll();
}

// Migrate: fix 'Advertising & A' → 'Advertising'
db.prepare("UPDATE categories SET name = 'Advertising' WHERE name = 'Advertising & A'").run();

// Migrate: add Shipping if missing from existing installs
const hasShipping = db.prepare("SELECT id FROM categories WHERE name = 'Shipping'").get();
if (!hasShipping) {
  db.prepare('INSERT INTO categories (name, budget_usd, color) VALUES (?, ?, ?)').run('Shipping', 4000, '#16A3A3');
}

// Seed master total budget if missing (default = sum of category budgets)
const hasTotalBudget = db.prepare("SELECT key FROM settings WHERE key = 'total_budget_usd'").get();
if (!hasTotalBudget) {
  const { total } = db.prepare('SELECT COALESCE(SUM(budget_usd), 0) as total FROM categories').get();
  db.prepare("INSERT INTO settings (key, value) VALUES ('total_budget_usd', ?)").run(String(total));
}

// Seed default exchange rates
const { count: rateCount } = db.prepare('SELECT COUNT(*) as count FROM exchange_rates').get();
if (rateCount === 0) {
  const insert = db.prepare('INSERT INTO exchange_rates (currency, rate, is_override) VALUES (?, ?, 0)');
  insert.run('USD', 1.0);
  insert.run('CNY', 7.24);
  insert.run('PKR', 278.5);
}

export default db;
