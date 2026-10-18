import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const port = Number(process.argv[2] ?? 3000);
if (![3000,3001].includes(port)) throw Error("Only localhost ports 3000/3001");
const label = port === 3000 ? "development" : "production";
const base = `http://127.0.0.1:${port}`;
const variants = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
];
const urls = ["/login","/register","/design-preview"];
function median(xs) {
  const a=[...xs].sort((a,b)=>a-b);
  if (!a.length) return null;
  return Math.round((a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2)*10)/10;
}
const output = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const variant of variants) {
    const context = await browser.newContext({
      viewport: variant.viewport, deviceScaleFactor: variant.deviceScaleFactor, reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    await context.addInitScript(() => {
      window.__cnttPerf = { lcp: 0, cls: 0, longTasks: 0 };
      try {
        new PerformanceObserver(list => {
          for(const e of list.getEntries()) window.__cnttPerf.lcp = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
      } catch {}
      try {
        new PerformanceObserver(list => {
          for(const e of list.getEntries()) if(!e.hadRecentInput) window.__cnttPerf.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
      } catch {}
      try {
        new PerformanceObserver(list => {
          for(const e of list.getEntries()) if(e.duration >= 50) window.__cnttPerf.longTasks++;
        }).observe({ type: "longtask", buffered: true });
      } catch {}
    });
    for(const uri of urls) {
      const samples=[];
      for(let i=0;i<4;i++) {
        const page=await context.newPage();
        const requestFailures=[];
        page.on("requestfailed",req=>requestFailures.push(req.failure()?.errorText ?? "unknown"));
        const wall=Date.now();
        try {
          const response=await page.goto(base + uri, { waitUntil:"load", timeout:30000 });
          await page.waitForTimeout(600);
          const metrics=await page.evaluate(() => {
            const nav=performance.getEntriesByType("navigation")[0];
            const fcp=performance.getEntriesByType("paint").find(x=>x.name==="first-contentful-paint");
            const perf=window.__cnttPerf || {};
            return {
              dclMs: nav?.domContentLoadedEventEnd ?? null,
              loadMs: nav?.loadEventEnd ?? null,
              responseStartMs: nav?.responseStart ?? null,
              fcpMs: fcp?.startTime ?? null,
              lcpMs: perf.lcp || null,
              cls: perf.cls ?? null,
              longTasks: perf.longTasks ?? null,
              resourceCount: performance.getEntriesByType("resource").length,
              jsResources: performance.getEntriesByType("resource").filter(r=>r.name.includes(".js")).length,
            };
          });
          samples.push({ run:i+1, status:response?.status(), ...metrics, wallMs:Date.now()-wall, failedRequests:requestFailures.length });
        } catch(err) {
          samples.push({ run:i+1,error:String(err).slice(0,170), wallMs:Date.now()-wall});
        } finally {
          await page.close();
        }
      }
      const v={label,viewport:variant.name,uri,samples};
      for(const k of ["responseStartMs","dclMs","loadMs","fcpMs","lcpMs","resourceCount","jsResources","longTasks"]) {
        v[k+"Median"]=median(samples.map(s=>s[k]).filter(x=>Number.isFinite(x)));
      }
      v.errors=samples.filter(s=>s.status!==200 || s.failedRequests>0).length;
      console.log(`${label} ${variant.name} ${uri}: TTFB=${v.responseStartMsMedian} DCL=${v.dclMsMedian} FCP=${v.fcpMsMedian} LCP=${v.lcpMsMedian} ms | ${v.errors}/4 request failures`);
      output.push(v);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
const file=path.resolve("ui-audit-results","performance",`browser-${label}.json`);
await mkdir(path.dirname(file),{recursive:true});
await writeFile(file, JSON.stringify({createdAt:new Date().toISOString(),label,method:"Chromium headless, normal local LAN conditions, 4 navigations per page/viewport",output},null,2));
console.log("REPORT "+file);
if(output.some(x=>x.errors>0)) process.exitCode=1;
