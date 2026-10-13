'use client';

import { useEffect, useState } from 'react';
import { Users, Copy, TriangleAlert, TrendingUp, BadgeCheck } from 'lucide-react';
import { loadState, paperBuy, saveState, fmtUSD, type PaperState } from '@/lib/quasar';
import { cn } from '@/lib/utils';

type FictionalTrader = {
  id: string;
  name: string;
  avatar: string;
  style: string;
  winRate: number;
  ret30d: number;
  followers: number;
  bio: string;
  pick: { label: string; symbol: string; yahoo: string; kind: 'crypto' | 'stock' };
  recent: string[]; // simulated recent trade blurbs
};

// All traders are fictional demo personas — their "trades" are simulated.
const TRADERS: FictionalTrader[] = [
  {
    id: 't1', name: 'Aarav "TrendRider" Mehta', avatar: '🧑‍💼', style: 'Trend following',
    winRate: 58, ret30d: 12.4, followers: 12840,
    bio: 'Rides crypto trends with Supertrend + EMA filters. Cuts losers fast.',
    pick: { label: 'BTC/USD', symbol: 'BTC', yahoo: 'BTC-USD', kind: 'crypto' },
    recent: ['Bought BTC @ 64,210 (Supertrend flip)', 'Sold ETH @ 3,412 (+6.2%)', 'Bought SOL @ 142.8'],
  },
  {
    id: 't2', name: 'Priya "Reversal" Nair', avatar: '👩‍💻', style: 'Mean reversion',
    winRate: 64, ret30d: 8.1, followers: 9320,
    bio: 'Buys fear, sells greed. RSI + Bollinger range trader on large caps.',
    pick: { label: 'RELIANCE (NSE)', symbol: 'RELIANCE', yahoo: 'RELIANCE.NS', kind: 'stock' },
    recent: ['Bought RELIANCE @ 2,412 (RSI 28)', 'Sold TCS @ 3,980 (+3.1%)', 'Bought INFY @ 1,512'],
  },
  {
    id: 't3', name: 'Vikram "Breakout" Singh', avatar: '🧔', style: 'Momentum breakout',
    winRate: 47, ret30d: 18.9, followers: 15230,
    bio: 'High-risk momentum hunter. Big wins, big drawdowns — not for the faint-hearted.',
    pick: { label: 'NVDA', symbol: 'NVDA', yahoo: 'NVDA', kind: 'stock' },
    recent: ['Bought NVDA @ 182.4 (20-day high)', 'Sold TSLA @ 248.1 (+11.7%)', 'Stopped MARA @ -4.2%'],
  },
  {
    id: 't4', name: 'Sofia "Steady" Rossi', avatar: '👩‍🦰', style: 'Swing / low leverage',
    winRate: 61, ret30d: 6.3, followers: 7410,
    bio: 'Slow and steady: 5x max leverage, always with stop-loss. Tortuga mindset. 🐢',
    pick: { label: 'ETH/USD', symbol: 'ETH', yahoo: 'ETH-USD', kind: 'crypto' },
    recent: ['Bought ETH @ 3,298 (5x, SL armed)', 'Sold AAPL @ 232.5 (+2.8%)', 'Bought MSFT @ 428.1'],
  },
  {
    id: 't5', name: 'Kenji "Scalp" Tanaka', avatar: '🧑‍🎤', style: 'Intraday scalping',
    winRate: 71, ret30d: 5.2, followers: 6890,
    bio: 'Dozens of tiny intraday wins. Watch out: commissions eat scalpers alive.',
    pick: { label: 'AAPL', symbol: 'AAPL', yahoo: 'AAPL', kind: 'stock' },
    recent: ['Scalped AAPL +0.4% (12 min)', 'Scalped MSFT +0.3% (8 min)', 'Scalped NVDA -0.2% (stopped)'],
  },
  {
    id: 't6', name: 'Lena "Diamond" Fischer', avatar: '👱‍♀️', style: 'Pattern trading',
    winRate: 52, ret30d: 9.7, followers: 8140,
    bio: 'Trades diamond + harmonic completions at D zones. Patient, selective.',
    pick: { label: 'SOL/USD', symbol: 'SOL', yahoo: 'SOL-USD', kind: 'crypto' },
    recent: ['Bought SOL @ D zone 138.2', 'Waiting: BTC diamond forming', 'Sold ETH bat completion (+4.4%)'],
  },
];

type CopySub = { traderId: string; traderName: string; symbol: string; amount: number; time: number };
const COPY_KEY = 'quasar-copy-subs-v1';

function loadSubs(): CopySub[] {
  try {
    return JSON.parse(localStorage.getItem(COPY_KEY) ?? '[]') as CopySub[];
  } catch { return []; }
}

export default function CopyPage() {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [subs, setSubs] = useState<CopySub[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { setSubs(loadSubs()); }, []);

  const copyTrader = async (t: FictionalTrader) => {
    const amount = Math.max(10, parseFloat(amounts[t.id] || '0'));
    if (!(amount > 0)) { setMsg({ ok: false, text: 'Enter a copy amount above $0.' }); return; }
    setBusy(t.id); setMsg(null);
    try {
      // Live demo price for the trader's current pick
      let price = 0;
      if (t.pick.kind === 'crypto') {
        const kraken = t.pick.symbol === 'BTC' ? 'XBTUSD' : `${t.pick.symbol}USD`;
        const r = await fetch(`/api/ticker?pair=${kraken}`, { cache: 'no-store' });
        const j = await r.json();
        const row = (j.data as { symbol: string; price: number }[] | undefined)?.[0];
        price = row?.price ?? 0;
      } else {
        const r = await fetch(`/api/stocks?symbols=${t.pick.symbol}`, { cache: 'no-store' });
        const j = await r.json();
        const q = (j.quotes as { symbol: string; priceUSD: number }[] | undefined)?.find((x) => x.symbol === t.pick.symbol);
        price = q?.priceUSD ?? 0;
      }
      if (!(price > 0)) throw new Error('price unavailable');
      const s: PaperState = (() => {
        const st = loadState();
        return { ...st, holdings: { ...st.holdings }, positions: [...st.positions], options: [...(st.options ?? [])], orders: [...st.orders], snapshots: [...st.snapshots] };
      })();
      const res = paperBuy(s, t.pick.symbol, amount, price, t.pick.kind === 'stock' ? t.pick.symbol : undefined, 'delivery');
      if (!res.ok) throw new Error(res.error);
      const sub: CopySub = { traderId: t.id, traderName: t.name, symbol: t.pick.symbol, amount, time: Date.now() };
      const next = [sub, ...loadSubs()].slice(0, 20);
      localStorage.setItem(COPY_KEY, JSON.stringify(next));
      setSubs(next);
      setMsg({ ok: true, text: `Copied ${t.name}: bought ${fmtUSD(amount)} of ${t.pick.label} @ ${fmtUSD(price, 4)} into your demo portfolio (simulated copy).` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Copy failed (demo).' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Users size={22} className="text-accent" /> Copy Trading
        </h1>
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-full px-2.5 py-1">
          Simulated
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-5 max-w-2xl">
        Mirror <span className="text-slate-200 font-semibold">fictional demo traders</span> into your paper portfolio
        with one tap. Their profiles, stats and "recent trades" are <span className="text-slate-200 font-semibold">simulated personas for learning</span> —
        study their <em>process</em>, not just returns. Copying copies losses too.
      </p>

      {msg && (
        <div className={cn('mb-4 text-xs rounded-xl px-3 py-2.5 border', msg.ok ? 'text-up bg-up/10 border-up/30' : 'text-down bg-down/10 border-down/30')}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {TRADERS.map((t) => (
          <div key={t.id} className="bg-panel border border-edge rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{t.avatar}</span>
              <div className="flex-1">
                <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  {t.name} <BadgeCheck size={14} className="text-accent" />
                </div>
                <div className="text-[11px] text-slate-500">{t.style} · 👥 {t.followers.toLocaleString()} followers</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-3">{t.bio}</p>
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div className="bg-void/60 rounded-xl py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Win rate</div>
                <div className="text-sm font-extrabold font-mono text-white">{t.winRate}%</div>
              </div>
              <div className="bg-void/60 rounded-xl py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">30d return</div>
                <div className={cn('text-sm font-extrabold font-mono', t.ret30d >= 0 ? 'text-up' : 'text-down')}>
                  {t.ret30d >= 0 ? '+' : ''}{t.ret30d}%
                </div>
              </div>
              <div className="bg-void/60 rounded-xl py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Pick</div>
                <div className="text-sm font-extrabold font-mono text-accent">{t.pick.label.split(' ')[0]}</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mb-3">
              <span className="font-bold text-slate-400">Recent (simulated):</span>
              <ul className="mt-1 space-y-0.5">
                {t.recent.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="10"
                placeholder="$ amount"
                value={amounts[t.id] ?? ''}
                onChange={(e) => setAmounts((a) => ({ ...a, [t.id]: e.target.value }))}
                className="flex-1 bg-void border border-edge rounded-xl px-3 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-accent/60"
              />
              <button
                onClick={() => copyTrader(t)}
                disabled={busy === t.id}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent/85 disabled:opacity-50 text-white text-sm font-bold rounded-xl px-5 py-2.5 transition"
              >
                <Copy size={14} /> {busy === t.id ? 'Copying…' : `Copy ${t.pick.label.split(' ')[0]}`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {subs.length > 0 && (
        <div className="bg-panel border border-edge rounded-2xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-edge text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp size={15} className="text-accent" /> Your copy subscriptions <span className="text-[10px] text-slate-500 font-normal">(demo)</span>
          </div>
          <div className="divide-y divide-edge/60">
            {subs.map((s, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 text-sm">
                <span className="text-slate-400 text-xs">{new Date(s.time).toLocaleDateString()}</span>
                <span className="text-white font-semibold">{s.traderName}</span>
                <span className="text-slate-500 text-xs">→</span>
                <span className="font-mono text-accent font-bold">{s.symbol}</span>
                <span className="ml-auto font-mono text-slate-300">{fmtUSD(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-void/60 border border-edge rounded-xl px-3 py-2.5">
        <TriangleAlert size={13} className="shrink-0 mt-0.5 text-amber-300" />
        <p>
          All traders here are <span className="text-slate-300 font-semibold">fictional</span>; stats and trades are
          simulated for education. Real copy trading copies losses, slippage and fees too.
          <span className="text-slate-300 font-semibold"> Demo only — not financial advice.</span>
        </p>
      </div>
    </div>
  );
}
