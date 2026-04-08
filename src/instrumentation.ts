export async function register() {
  // Only run in Node.js server runtime, and not on Vercel (serverless can't keep setInterval alive)
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { startHistoryRecorder } = await import("@/lib/background/history-recorder");
    startHistoryRecorder();
  }
}
