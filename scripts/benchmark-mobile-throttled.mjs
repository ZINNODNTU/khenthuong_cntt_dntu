import { chromium } from "@playwright/test";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
const browser=await chromium.launch({headless:true});
const profiles=[{name:"fast4g-cpu4", latency:150, downlink:200_000, uplink:90_000, cpu:4}];
const urls=["/login","/register","/design-preview"];
const results=[];
try {
 for(const p of profiles){
  for(const uri of urls){
   const samples=[];
   for(let i=0;i<3;i++){
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:"block",reducedMotion:"reduce"});
    await context.addInitScript(()=>{
      window.__perfResult={lcp:0,cls:0};
      try{new PerformanceObserver(list=>{for(const x of list.getEntries())window.__perfResult.lcp=x.startTime}).observe({type:"largest-contentful-paint",buffered:true})}catch{}
      try{new PerformanceObserver(list=>{for(const x of list.getEntries())if(!x.hadRecentInput)window.__perfResult.cls+=x.value}).observe({type:"layout-shift",buffered:true})}catch{}
    });
    const page=await context.newPage();
    const cdp=await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions",{offline:false,latency:p.latency,downloadThroughput:p.downlink,uploadThroughput:p.uplink});
    await cdp.send("Emulation.setCPUThrottlingRate",{rate:p.cpu});
    try{
     const res=await page.goto("http://127.0.0.1:3001"+uri,{waitUntil:"load",timeout:60000});
     await page.waitForTimeout(1100);
     const m=await page.evaluate(()=>{
      const n=performance.getEntriesByType("navigation")[0];
      const f=performance.getEntriesByType("paint").find(x=>x.name==="first-contentful-paint");
      return {ttfbMs:n.responseStart,dclMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd,fcpMs:f?.startTime||0,lcpMs:window.__perfResult?.lcp||0,cls:window.__perfResult?.cls||0};
     });
     samples.push({status:res.status(),...m});
    }catch(err){samples.push({error:String(err).slice(0,140)})}
    await context.close();
   }
   const vals=key=>samples.map(x=>x[key]).filter(Number.isFinite).sort((a,b)=>a-b);
   const median=k=>{let a=vals(k);return a.length?+a[Math.floor(a.length/2)].toFixed(1):null};
   const x={profile:p.name,uri,samples,ttfbMedian:median("ttfbMs"),fcpMedian:median("fcpMs"),lcpMedian:median("lcpMs"),clsMedian:median("cls")};
   results.push(x);
   console.log(`${p.name} ${uri} -> LCP=${x.lcpMedian}ms FCP=${x.fcpMedian}ms TTFB=${x.ttfbMedian}ms CLS=${x.clsMedian}, successful=${samples.filter(x=>x.status===200).length}/3`);
  }
 }
}finally{await browser.close()}
const fp=path.resolve("ui-audit-results/performance","browser-production-throttled.json");
await mkdir(path.dirname(fp),{recursive:true});
await writeFile(fp,JSON.stringify({method:"Chromium DevTools network throttling 150ms latency, 1.6 Mbps, 4x CPU slowdown; headless mobile viewport 390x844",results},null,2));
console.log("REPORT "+fp);
if(results.some(x=>x.samples.some(y=>y.status!==200)))process.exitCode=1;
