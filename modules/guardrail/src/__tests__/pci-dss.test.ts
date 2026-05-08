/**
 * K2 — PCI DSS 결제 도메인 8개 룰 단위 테스트.
 * 모두 heuristic 기반 — false positive 가능성 명시된 베타 단계.
 */
import { describe, it, expect } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import noPlainCardNumber from '../rules-default/no-plain-card-number.js';
import noCvvLogging from '../rules-default/no-cvv-logging.js';
import requireTls12Plus from '../rules-default/require-tls-1-2-plus.js';
import verifyPgResponse from '../rules-default/verify-pg-response.js';
import requireIdempotencyKey from '../rules-default/require-idempotency-key.js';
import separateRefundPermission from '../rules-default/separate-refund-permission.js';
import preserveTransactionLog from '../rules-default/preserve-transaction-log.js';
import maskCardNumber from '../rules-default/mask-card-number.js';

describe('no-plain-card-number', () => {
  it('flags Sequelize column "card_number" with plain string type', () => {
    const src = `await queryInterface.createTable('payments', { card_number: { type: 'STRING' } });\n`;
    const r = runFileWithSource('mig.ts', src, 'typescript', [noPlainCardNumber]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes when column name has encrypted suffix', () => {
    const src = `await queryInterface.createTable('payments', { card_number_encrypted: { type: 'STRING' } });\n`;
    const r = runFileWithSource('mig.ts', src, 'typescript', [noPlainCardNumber]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-cvv-logging', () => {
  it('flags console.log of cvv variable', () => {
    const src = `console.log('payment input', { cvv });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [noCvvLogging]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('flags logger.info with cvc reference', () => {
    const src = `logger.info('debug', { cvc: input.cvc });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [noCvvLogging]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes when no CVV is logged', () => {
    const src = `logger.info('payment', { amount, currency });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [noCvvLogging]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('require-tls-1-2-plus', () => {
  it('flags secureProtocol: TLSv1_method', () => {
    const src = `https.createServer({ secureProtocol: 'TLSv1_method' }, app);\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [requireTls12Plus]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('flags minVersion: TLSv1.1', () => {
    const src = `tls.connect({ host, port, minVersion: 'TLSv1.1' });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [requireTls12Plus]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes for TLSv1.2 minimum', () => {
    const src = `tls.connect({ host, port, minVersion: 'TLSv1.2' });\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [requireTls12Plus]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('verify-pg-response', () => {
  it('flags PG fetch without signature/hash check', () => {
    const src = `async function callPg() {
  const res = await axios.post('/payments/charge', payload);
  return res.data;
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [verifyPgResponse]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes when signature is verified', () => {
    const src = `async function callPg() {
  const res = await axios.post('/payments/charge', payload);
  if (!verify(res.data, res.data.signature)) throw new Error('bad');
  return res.data;
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [verifyPgResponse]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('require-idempotency-key', () => {
  it('flags pay() without idempotencyKey', () => {
    const src = `async function pay(amount: number) {
  return await stripe.charges.create({ amount });
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [requireIdempotencyKey]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes when idempotencyKey is present', () => {
    const src = `async function pay(amount: number, idempotencyKey: string) {
  return await stripe.charges.create({ amount }, { idempotencyKey });
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [requireIdempotencyKey]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('separate-refund-permission', () => {
  it('flags refund() function without permission check', () => {
    const src = `async function refund(orderId: string) {
  return await pgClient.refund(orderId);
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [separateRefundPermission]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes when permission is checked', () => {
    const src = `async function refund(orderId: string) {
  if (!hasPermission(req.user, 'refund')) throw new Error('forbidden');
  return await pgClient.refund(orderId);
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [separateRefundPermission]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('preserve-transaction-log', () => {
  it('flags pay() without any audit log call', () => {
    const src = `async function pay(amount: number) {
  return await stripe.charges.create({ amount, idempotencyKey: 'k' });
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [preserveTransactionLog]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes when logger.info is called', () => {
    const src = `async function pay(amount: number) {
  const result = await stripe.charges.create({ amount, idempotencyKey: 'k' });
  logger.info('payment.charged', { amount, id: result.id });
  return result;
}\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [preserveTransactionLog]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('mask-card-number', () => {
  it('flags template string interpolating cardNumber', () => {
    const src = "const label = `pay with ${cardNumber} now`;\n";
    const r = runFileWithSource('a.ts', src, 'typescript', [maskCardNumber]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('flags JSON.stringify with cardNumber field', () => {
    const src = `console.log(JSON.stringify({ cardNumber, amount }));\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [maskCardNumber]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes when masked helper is used', () => {
    const src = "const label = `pay with ${maskCard(cardNumber)} now`;\n";
    const r = runFileWithSource('a.ts', src, 'typescript', [maskCardNumber]);
    expect(r.diagnostics).toHaveLength(0);
  });
});
