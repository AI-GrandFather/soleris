import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import categoriesRouter from './routes/categories.js';
import expensesRouter from './routes/expenses.js';
import ratesRouter from './routes/rates.js';
import settingsRouter from './routes/settings.js';
import skusRouter from './routes/skus.js';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/categories', categoriesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/skus', skusRouter);
app.use('/api/chat', chatRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Soleris Ledger API → http://localhost:${PORT}`);
});
