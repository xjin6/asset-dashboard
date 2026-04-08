interface Position {
  symbolName: string;
  symbol: string;
  quantity: number;
  currentPrice: number;
  currency: string;
  marketValue: number;
  dailyPL: number;
  dailyPLPercent: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
}

interface EmailData {
  totalAssets: number;
  totalAssetsCurrency: string;
  dailyPL: number;
  dailyPLPercent: number;
  totalPL: number;
  totalPLPercent: number;
  positions: Position[];
  savingsTotal: number;
  morganTotal: number;
  fidelityTotal: number;
  lbTotal: number;
  generatedAt: string;
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("en-HK", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n: number, currency = "HKD") {
  const sym = currency === "USD" ? "US$" : currency === "CNY" ? "CN¥" : "HK$";
  return `${n < 0 ? "-" : ""}${sym}${fmt(Math.abs(n), 2)}`;
}

function plColor(n: number) {
  return n >= 0 ? "#16a34a" : "#dc2626";
}

function plArrow(n: number) {
  return n >= 0 ? "▲" : "▼";
}

export function buildEmailHtml(data: EmailData): string {
  const posRows = data.positions.map((p) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">
        <div style="font-weight:600;font-size:14px;color:#0f172a;">${p.symbolName}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:1px;">${p.symbol} · ${fmt(p.quantity, 0)} shares</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">
        <div style="font-size:14px;color:#0f172a;font-weight:500;">${fmtCurrency(p.currentPrice, p.currency)}</div>
        <div style="font-size:11px;color:#94a3b8;">${fmtCurrency(p.marketValue, p.currency)} MV</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">
        <div style="font-size:13px;font-weight:600;color:${plColor(p.dailyPL)};">
          ${plArrow(p.dailyPL)} ${fmtCurrency(Math.abs(p.dailyPL), p.currency)}
        </div>
        <div style="font-size:11px;color:${plColor(p.dailyPL)};opacity:0.8;">${p.dailyPLPercent >= 0 ? "+" : ""}${p.dailyPLPercent.toFixed(2)}%</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">
        <div style="font-size:13px;font-weight:600;color:${plColor(p.unrealizedPL)};">
          ${p.unrealizedPL >= 0 ? "+" : ""}${p.unrealizedPLPercent.toFixed(2)}%
        </div>
        <div style="font-size:11px;color:#94a3b8;">${fmtCurrency(p.unrealizedPL, p.currency)}</div>
      </td>
    </tr>
  `).join("");

  const allocationRows = [
    { label: "Longbridge", value: data.lbTotal, color: "#eab308" },
    { label: "Morgan Stanley", value: data.morganTotal, color: "#3b82f6" },
    { label: "Fidelity", value: data.fidelityTotal, color: "#22c55e" },
    { label: "Savings", value: data.savingsTotal, color: "#f97316" },
  ].filter(a => a.value > 0).map(a => {
    const pct = data.totalAssets > 0 ? (a.value / data.totalAssets * 100) : 0;
    return `
      <tr>
        <td style="padding:6px 0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${a.color};flex-shrink:0;"></div>
            <span style="font-size:13px;color:#475569;">${a.label}</span>
          </div>
        </td>
        <td style="padding:6px 0;text-align:right;">
          <span style="font-size:13px;font-weight:600;color:#0f172a;">HK$${fmt(a.value)}</span>
        </td>
        <td style="padding:6px 0;text-align:right;padding-left:12px;">
          <span style="font-size:12px;color:#94a3b8;">${pct.toFixed(1)}%</span>
        </td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);border-radius:16px;padding:28px 28px 24px;margin-bottom:16px;">
      <div style="font-size:12px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">Asset Dashboard · ${data.generatedAt}</div>
      <div style="font-size:32px;font-weight:700;color:#f8fafc;letter-spacing:-0.5px;">HK$${fmt(data.totalAssets)}</div>
      <div style="margin-top:6px;font-size:13px;color:#94a3b8;">Total Assets</div>
      <div style="margin-top:16px;display:flex;gap:24px;">
        <div>
          <div style="font-size:11px;color:#64748b;margin-bottom:3px;">TODAY</div>
          <div style="font-size:18px;font-weight:700;color:${plColor(data.dailyPL)};">
            ${data.dailyPL >= 0 ? "+" : ""}HK$${fmt(Math.abs(data.dailyPL))}
          </div>
          <div style="font-size:12px;color:${plColor(data.dailyPL)};opacity:0.8;">${data.dailyPL >= 0 ? "+" : ""}${data.dailyPLPercent.toFixed(2)}%</div>
        </div>
        <div style="width:1px;background:#334155;"></div>
        <div>
          <div style="font-size:11px;color:#64748b;margin-bottom:3px;">TOTAL P&amp;L</div>
          <div style="font-size:18px;font-weight:700;color:${plColor(data.totalPL)};">
            ${data.totalPL >= 0 ? "+" : ""}HK$${fmt(Math.abs(data.totalPL))}
          </div>
          <div style="font-size:12px;color:${plColor(data.totalPL)};opacity:0.8;">${data.totalPL >= 0 ? "+" : ""}${data.totalPLPercent.toFixed(2)}%</div>
        </div>
      </div>
    </div>

    <!-- Positions -->
    <div style="background:#ffffff;border-radius:16px;padding:4px 0;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <div style="padding:16px 16px 8px;font-size:13px;font-weight:600;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;">Longbridge Positions</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#94a3b8;font-weight:500;text-transform:uppercase;">Stock</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#94a3b8;font-weight:500;text-transform:uppercase;">Price / MV</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#94a3b8;font-weight:500;text-transform:uppercase;">Daily</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#94a3b8;font-weight:500;text-transform:uppercase;">Total P&amp;L</th>
          </tr>
        </thead>
        <tbody>${posRows}</tbody>
      </table>
    </div>

    <!-- Allocation -->
    <div style="background:#ffffff;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <div style="font-size:13px;font-weight:600;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:14px;">Portfolio Allocation</div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${allocationRows}</tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0 8px;">
      <div style="font-size:11px;color:#cbd5e1;">Asset Dashboard · Auto-generated report</div>
    </div>
  </div>
</body>
</html>`;
}
