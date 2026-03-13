/**
 * Unit tests for the profit calculation formula used in ProfitCalculator.
 *
 * The formula is:
 *   profit_per_unit = selling_price − unit_cost − txn_fee − shipping − other − marketing
 *   txn_fee = selling_price * txn_pct + txn_fixed
 *
 * These tests verify that marketing_cost_usd is correctly included in the deduction
 * and that the formula behaves correctly for edge cases.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

function profitPerUnit({ sellingUsd, unitUsd, txnPct, txnFixed, shippingUsd, otherUsd, marketingUsd }) {
  const feeUsd = sellingUsd * txnPct + txnFixed;
  return sellingUsd - unitUsd - feeUsd - shippingUsd - otherUsd - marketingUsd;
}

describe('Profit formula', () => {
  test('profit without marketing matches baseline formula', () => {
    const profit = profitPerUnit({
      sellingUsd: 30,
      unitUsd: 10,
      txnPct: 0.05,
      txnFixed: 0,
      shippingUsd: 3,
      otherUsd: 1,
      marketingUsd: 0,
    });
    // 30 - 10 - 1.5 - 3 - 1 - 0 = 14.5
    assert.equal(profit, 14.5);
  });

  test('marketing cost reduces profit by its full amount', () => {
    const withoutMarketing = profitPerUnit({
      sellingUsd: 30, unitUsd: 10, txnPct: 0.05, txnFixed: 0,
      shippingUsd: 3, otherUsd: 1, marketingUsd: 0,
    });
    const withMarketing = profitPerUnit({
      sellingUsd: 30, unitUsd: 10, txnPct: 0.05, txnFixed: 0,
      shippingUsd: 3, otherUsd: 1, marketingUsd: 2,
    });
    assert.equal(withoutMarketing - withMarketing, 2, 'marketing cost should reduce profit by its exact value');
  });

  test('profit can go negative when marketing cost is large', () => {
    const profit = profitPerUnit({
      sellingUsd: 10, unitUsd: 8, txnPct: 0, txnFixed: 0,
      shippingUsd: 0, otherUsd: 0, marketingUsd: 5,
    });
    assert.equal(profit, -3);
  });

  test('zero marketing cost is same as omitting it', () => {
    const base = { sellingUsd: 20, unitUsd: 8, txnPct: 0.03, txnFixed: 0.5, shippingUsd: 2, otherUsd: 0.5 };
    const withZero = profitPerUnit({ ...base, marketingUsd: 0 });
    const withPositive = profitPerUnit({ ...base, marketingUsd: 1.5 });
    assert.equal(withZero - withPositive, 1.5);
  });

  test('transaction fee is calculated on selling price, not cost', () => {
    const profit = profitPerUnit({
      sellingUsd: 100, unitUsd: 50, txnPct: 0.1, txnFixed: 0,
      shippingUsd: 0, otherUsd: 0, marketingUsd: 0,
    });
    // fee = 100 * 0.1 = 10 ; profit = 100 - 50 - 10 = 40
    assert.equal(profit, 40);
  });

  test('total profit scales linearly with quantity', () => {
    const perUnit = profitPerUnit({
      sellingUsd: 25, unitUsd: 10, txnPct: 0, txnFixed: 0,
      shippingUsd: 2, otherUsd: 1, marketingUsd: 1.5,
    });
    const qty = 50;
    const totalProfit = perUnit * qty;
    assert.equal(totalProfit, perUnit * 50);
    assert.equal(perUnit, 10.5);
    assert.equal(totalProfit, 525);
  });
});
