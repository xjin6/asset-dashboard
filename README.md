# Asset Dashboard

A personal, self-hosted financial dashboard that aggregates your holdings across brokerages, savings accounts, and investment platforms into a single real-time view.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![License](https://img.shields.io/badge/license-MIT-green)

---

## What It Does

- **LongBridge brokerage** — Live positions, P&L, and real-time price streaming via the LongBridge OpenAPI
- **Manual holdings** (e.g. Morgan Stanley Stock Plan, Fidelity) — Add your positions by hand; prices are fetched automatically
- **Savings accounts** — Track balances across multiple banks and currencies (HKD, USD, CNY)
- **Portfolio overview** — Total assets chart, allocation donut, and historical value tracking
- **AI insights** — Ask Claude (or Azure AI) about your portfolio: daily movers, concentration risk, and actionable suggestions
- **Email reports** — Send yourself a snapshot of your portfolio via SMTP
- **Password protection** — Optional login gate so you can host it remotely

---

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/) for charts
- [TanStack Query](https://tanstack.com/query) for data fetching
- [LongBridge OpenAPI SDK](https://open.longportapp.com/en/docs)
- [Anthropic Claude API](https://www.anthropic.com/) (optional, for AI insights)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/xjin6/asset-dashboard.git
cd asset-dashboard
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local   # or just create it manually
```

| Variable | Required | Description |
|---|---|---|
| `LONGPORT_APP_KEY` | Yes* | LongBridge app key |
| `LONGPORT_APP_SECRET` | Yes* | LongBridge app secret |
| `LONGPORT_ACCESS_TOKEN` | Yes* | LongBridge access token |
| `ANTHROPIC_API_KEY` | No | Enables AI insights via Claude |
| `AZURE_AI_KEY` | No | Alternative AI backend (Azure) |
| `AZURE_AI_ENDPOINT` | No | Azure AI endpoint URL |
| `DASHBOARD_PASSWORD` | No | Password to protect the dashboard |
| `EMAIL_USER` | No | SMTP sender address |
| `EMAIL_PASS` | No | SMTP password / app token |
| `EMAIL_TO` | No | Recipient address for email reports |

\* Required only if you want live LongBridge data. The dashboard works without it — manual holdings and savings still work fully.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Features in Detail

### Portfolio Overview

The main dashboard shows:
- Total assets in HKD (toggle to USD or CNY)
- Asset history chart — 1H / 24H / 7D / 30D / 90D time ranges
- Allocation breakdown across all sources (LongBridge, Morgan Stanley, Fidelity, Savings)
- Live connection status indicator

Portfolio value is recorded every 60 seconds in the background and stored locally in `data/asset-history.json`.

### LongBridge Integration

Connects to [LongBridge OpenAPI](https://open.longportapp.com/en/docs) to pull:
- Current positions with live prices (HK and US markets)
- Account balances across HKD / USD / CNH
- Transaction history (deposits, withdrawals, trades)
- Real-time price streaming via SSE

Get your API credentials at [open.longportapp.com](https://open.longportapp.com).

### Manual Holdings

For brokerages without an open API (e.g. Morgan Stanley Stock Plan, Fidelity Net Benefits):
- Enter your positions manually — symbol + quantity
- Prices are fetched automatically via LongBridge quote API
- Drag to reorder, stored persistently in `data/`

### Adding Other Brokerages

Most brokerages have some form of API or data export. To integrate a new one:

1. Check if your broker has an open API (Interactive Brokers, Alpaca, Schwab, etc.)
2. Add a new API route under `src/app/api/` to fetch your positions
3. Create a provider in `src/lib/providers/` to manage client state
4. Add a card component in `src/components/dashboard/`

The existing LongBridge integration (`src/lib/longbridge/`) is a good reference. For brokerages without an API, follow the manual holdings pattern (`src/lib/providers/manual-positions-provider.tsx`) instead.

### Savings Accounts

Track balances across any number of bank accounts:
- Multi-currency per account (HKD, USD, CNY)
- Automatic HKD conversion using live FX rates
- Bank logos auto-detected from the account name
- Drag to reorder

### AI Insights

With an Anthropic API key (or Azure AI endpoint), the dashboard can:
- Auto-generate insights: daily P&L summary, biggest movers, concentration risk, and concrete recommendations
- Answer questions about your portfolio in a chat interface
- Pull in relevant market news for context (via Google News RSS — no extra API key needed)

### Email Reports

Configure SMTP credentials to send yourself a formatted portfolio snapshot. Includes total assets, daily P&L, and a per-broker breakdown. Works with any standard SMTP provider.

---

## Deployment

Designed to run locally or on a small VPS. Uses local JSON files for persistence — no database required.

For remote access without exposing your home IP, [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) works well:

```bash
cloudflared tunnel --url http://localhost:3000
```

---

## Data & Privacy

All your financial data lives in the `data/` directory on your own machine or server. Nothing is sent anywhere except:
- **LongBridge API** — to fetch your own account data
- **Anthropic / Azure** — only if you configure AI insights
- **Your SMTP provider** — only if you configure email reports

The `data/` directory is excluded from version control via `.gitignore`.

---

## License

MIT
