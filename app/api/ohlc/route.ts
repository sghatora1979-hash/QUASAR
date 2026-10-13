export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { PAIRS, pairBySymbol, qsrSimPrice } from '@/lib/pairs';
import { krakenGet, resultKey, jsonError } from '../_lib';

type OhlcRow = [number, string, string, string, string, string, string, number];

// GET /api/ohlc?pair=BTCUSD&interval=60  (pair = display symbol or Kraken alt)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const raw = (sp.get('pair') ?? 'BTCUSD').toUpperCase().replace(/USD$/, '');
  const info = pairBySymbol(raw) ?? PAIRS.find((p) => p.kraken === raw + 'USD');
  if (!info) return jsonError('Unknown pair', 400);
  const interval = sp.get('interval') ?? '60';

  // Native demo pair: synthetic candles around the simulated price.
  if (info.native && info.symbol === 'QSR') {
    const now = Date.now();
    const stepMs = parseInt(interval, 10) > 0 ? parseInt(interval, 10) * 60_000 : 3600_000;
    const closes: number[] = [];
    for (let i = 60; i >= 1; i--) closes.push(qsrSimPrice(now - i * stepMs));
    return Response.json({
      ok: true,
      symbol: info.symbol,
      closes,
      data: closes.map((close) => ({ close })),
      count: closes.length,
      simulated: true,
    });
  }

  const env = await krakenGet<Record<string, OhlcRow[]>>('/OHLC', {
    pair: info.kraken,
    interval,
  });
  if (env.error.length || !env.result) return jsonError(env.error[0] ?? 'OHLC unavailable');
  const rows = env.result[resultKey(info.kraken)] ?? env.result[info.kraken] ?? [];
  const closes = rows.map((r) => parseFloat(r[4]));
  return Response.json({ ok: true, symbol: info.symbol, closes, count: closes.length });
}
