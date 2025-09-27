# Bailey’s Exchange (FX Converter)

> Tiny, offline‑friendly currency converter for travel. Built with vanilla HTML/CSS/JS (and optional Vite PWA). Uses the Frankfurter API (ECB reference rates).

Version: **v0.1.0**
Author: **penningtonProgramming**

---

## Features

* Convert between **GBP, USD, KRW, JPY, EUR** (easy to add more)
* Live rate fetch from **Frankfurter** (`/v1/latest?base=…&symbols=…`)
* Smart formatting (0 decimals for JPY/KRW)
* Minimal, dependency‑free starter
* Optional: cache last good rate (offline fallback)
* Optional: PWA install (works offline for UI + cached responses)

> **Note**: Frankfurter reflects the ECB **daily mid‑market** rate, typically updated around **16:00 CET** on business days. If you need intraday/tick data, proxy a paid provider via Netlify Functions (see below).

---

## Project Structure

```
/ (repo root)
├─ index.html          # minimal UI (From/To, Amount, output)
├─ main.js             # fetch + render logic
├─ styles.css          # optional (or inline styles)
└─ README.md
```

---

## 🚀 Quick Start (no build tools)

1. Clone/download the repo.
2. Open **index.html** in your browser (double‑click), or serve locally for best results:

   ```bash
   npx serve .
   # or
   npx http-server . -p 5173
   ```
3. Change currencies/amounts — you’ll see `1 FROM = RATE TO` and the converted sum.

### Minimal HTML/JS Entry Points

* **index.html** includes:

  * two `<select>`s: `#from`, `#to`
  * `<input type="number" id="amount">`
  * `<pre id="out">` for output
* **main.js** does:

  * `fetch('https://api.frankfurter.dev/v1/latest?base=FROM&symbols=TO')`
  * `converted = amount * data.rates[TO]`
  * pretty prints with `Intl.NumberFormat`

---

## ⚠️ Limitations

* **ECB daily** rate only (typically one update per business day). Real POS/ATM rates include spreads/fees.
* No historical charting in the starter (can be added via `/timeseries`).

---

## License

MIT © Emmett Pennington

---

## 🙏 Acknowledgments

* **Frankfurter** — free, no‑key API backed by ECB reference rates.
* Inspiration: **Bailey** — the original Pound Hound.
