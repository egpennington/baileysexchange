const el = {
  from: document.getElementById('from'),
  to: document.getElementById('to'),
  amount: document.getElementById('amount'),
  out: document.getElementById('out'),
  status: document.getElementById('status'),
  fromCode: document.getElementById('fromCode'),
  net: document.getElementById('net'),
};

let lastRate = null;
let lastSource = '—'; // 'live' | 'cache' | '—'
let lastUpdated = null;

function zeroDec(code) {
  return code === 'KRW' || code === 'JPY';
}

function fmt(code, value) {
  const zero = zeroDec(code);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: zero ? 0 : 2,
    maximumFractionDigits: zero ? 0 : 2,
  }).format(value);
}

function cacheKey(from, to) {
  return `fx:${from}->${to}`;
}

async function fetchRate() {
  const from = el.from.value;
  const to = el.to.value;

  if (from === to) {
    lastRate = 1;
    lastSource = 'live';
    lastUpdated = new Date();
    render();
    return;
  }

  el.out.textContent = 'Loading…';

  try {
    const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.[to];
    if (typeof rate !== 'number') throw new Error('Rate missing');

    lastRate = rate;
    lastSource = 'live';
    lastUpdated = new Date();

    localStorage.setItem(cacheKey(from, to), JSON.stringify({ rate, ts: Date.now() }));
    render();
  } catch (err) {
    // fallback to cache
    const raw = localStorage.getItem(cacheKey(from, to));
    if (raw) {
      const { rate, ts } = JSON.parse(raw);
      lastRate = rate;
      lastSource = 'cache';
      lastUpdated = new Date(ts);
      render(`offline/API error — using cached rate (${Math.round((Date.now()-ts)/60000)} min old)`);
    } else {
      el.out.textContent = `Failed to fetch rate: ${err.message}`;
      el.status.textContent = 'Source: ECB mid-market via Frankfurter • Updated: —';
    }
  }
}

function render(extraMsg) {
  const from = el.from.value;
  const to = el.to.value;
  const amt = Number(el.amount.value) || 0;

  el.fromCode.textContent = from;

  const rateLine = lastRate != null
    ? `1 ${from} = ${lastRate.toFixed(6)} ${to}`
    : `1 ${from} = — ${to}`;

  const converted = lastRate != null ? amt * lastRate : 0;
  const sumLine = `${fmt(from, amt)} = ${fmt(to, converted)}`;

  el.out.innerHTML = `${sumLine}`;

  const updatedStr = lastUpdated ? lastUpdated.toLocaleString() : '—';
  const sourceStr = lastSource === 'cache' ? 'cached' : lastSource === 'live' ? 'live' : '—';
  el.status.textContent = `Source: ECB mid-market via Frankfurter • Updated: ${updatedStr} (${sourceStr})${extraMsg ? ' • ' + extraMsg : ''}`;
}

// UI helpers
function swap() {
  const a = el.from.value;
  const b = el.to.value;
  el.from.value = b;
  el.to.value = a;
  fetchRate();
}

function updateNetBadge() {
  el.net.textContent = navigator.onLine ? 'online' : 'offline';
  el.net.style.background = navigator.onLine ? '#e9ffe9' : '#fff5e9';
}

// init
document.addEventListener('DOMContentLoaded', () => {
  updateNetBadge();
  fetchRate();
  el.from.addEventListener('change', fetchRate);
  el.to.addEventListener('change', fetchRate);
  el.amount.addEventListener('input', render);
  document.getElementById('swap').addEventListener('click', swap);
  document.getElementById('refresh').addEventListener('click', fetchRate);
  window.addEventListener('online', updateNetBadge);
  window.addEventListener('offline', updateNetBadge);
});
