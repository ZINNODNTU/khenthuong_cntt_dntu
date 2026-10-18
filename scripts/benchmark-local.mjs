import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const params = new URLSearchParams(process.argv.slice(2).map((a) => {
  const [key, ...value] = a.replace(/^--/, "").split("=");
  return [key, value.join("=")];
}));
const port = Number(params.get("port") || 3000);
if (![3000, 3001].includes(port)) throw new Error("Only loopback ports 3000 and 3001 are accepted");
const base = `http://127.0.0.1:${port}`;
const prefix = params.get("label") || (port === 3000 ? "development" : "production");
if (!/^[a-z0-9_-]{1,30}$/i.test(prefix)) throw new Error("Invalid label");

const agent = { "user-agent": "CNTT-LocalPerfAudit/1.0", "accept": "text/html,application/json" };
function quantile(values, p) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.ceil(s.length * p) - 1)] * 10) / 10;
}
function compact(samples, elapsed) {
  const ok = samples.filter(x => x.status === x.expected && !x.error);
  const metrics = name => ok.map(x => x[name]).filter(v => Number.isFinite(v));
  const out = {
    requested: samples.length, passed: ok.length, errors: samples.length - ok.length,
    statusCounts: Object.fromEntries([...new Set(samples.map(x => String(x.status ?? x.error ?? "none")))].map(k => [k, samples.filter(x => String(x.status ?? x.error ?? "none") === k).length])),
    p50Ms: quantile(metrics("elapsedMs"), 0.5),
    p95Ms: quantile(metrics("elapsedMs"), 0.95),
    p99Ms: quantile(metrics("elapsedMs"), 0.99),
    ttfbP50Ms: quantile(metrics("ttfbMs"), 0.5),
    ttfbP95Ms: quantile(metrics("ttfbMs"), 0.95),
    avgResponseBytes: ok.length ? Math.round(ok.reduce((acc,x) => acc + x.bytes, 0) / ok.length) : null,
    wallMs: Math.round(elapsed),
    rps: +(samples.length / Math.max(elapsed, 1) * 1000).toFixed(2),
  };
  return out;
}
async function requestOne(url, expected) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      method: "GET", redirect: "manual", headers: agent, signal: controller.signal,
      cache: "no-store",
    });
    const ttfb = performance.now() - start;
    const buffer = await response.arrayBuffer();
    return {
      status: response.status, expected, bytes: buffer.byteLength,
      ttfbMs: Math.round(ttfb * 10) / 10,
      elapsedMs: Math.round((performance.now() - start) * 10) / 10,
    };
  } catch (e) {
    return { status: null, expected, error: String(e?.name || e) };
  } finally {
    clearTimeout(timer);
  }
}
async function batch(uri, expected, total, concurrency) {
  const url = base + uri;
  const start = performance.now();
  const samples = [];
  let index = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (index < total) {
      index++;
      samples.push(await requestOne(url, expected));
    }
  }));
  return { ...compact(samples, performance.now() - start), uri, concurrency, samples: samples.map(x=>({status:x.status, ttfbMs:x.ttfbMs, elapsedMs:x.elapsedMs, error:x.error})) };
}
const runs = [];
const workloads = [
  ["/login", 200, 25, 1],
  ["/register", 200, 25, 1],
  ["/design-preview", 200, 20, 1],
  ["/dashboard", 307, 20, 1],
  ["/login", 200, 35, 5],
  ["/login", 200, 35, 10],
  ["/design-preview", 200, 35, 5],
];
for (const [uri, expected, n, concurrency] of workloads) {
  // Warming the dynamic route avoids measuring first-time Next.js compilation on the steady-state runs.
  const warmup = await requestOne(base + uri, expected);
  if (warmup.status !== expected) throw new Error(`Route unavailable: ${uri} => ${warmup.status}`);
  const result = await batch(uri, expected, n, concurrency);
  runs.push(result);
  console.log(`${prefix} ${uri} c=${concurrency} ${result.passed}/${result.requested} | p50=${result.p50Ms}ms p95=${result.p95Ms}ms | ttfb-p95=${result.ttfbP95Ms}ms | rps=${result.rps}`);
}
const report = {
  createdAt: new Date().toISOString(), label: prefix, base, kind: "local-loopback",
  note: "Synthetic read-only HTTP test. Not real user load and not proof of Supabase/Drive throughput.",
  runs,
};
const folder = path.resolve("ui-audit-results", "performance");
await mkdir(folder, { recursive: true });
const file = path.join(folder, `http-${prefix}.json`);
await writeFile(file, JSON.stringify(report, null, 2));
console.log("REPORT " + file);
if (runs.some(x=>x.errors)) process.exitCode = 1;
