import { chromium } from "@playwright/test";
const browser = await chromium.launch();
try {
 for (const width of [390, 1440]) {
  for (let k=0;k<3;k++) {
   const context = await browser.newContext({viewport:{width,height:844},reducedMotion:"reduce"});
   await context.addInitScript(() => {
    window.__cnttShifts=[];
    new PerformanceObserver(list => {
     for(const event of list.getEntries()){
      if(event.hadRecentInput)continue;
      window.__cnttShifts.push({
       startTime: Math.round(event.startTime),
       value: Number(event.value.toFixed(5)),
       sources: (event.sources||[]).slice(0,5).map(x=>({
        node: x.node?x.node.tagName+"#"+(x.node.id||"")+"."+String(x.node.className).slice(0,65):"unknown",
        prev:x.previousRect, current:x.currentRect
       }))
      });
     }
    }).observe({type:"layout-shift",buffered:true});
   });
   const page=await context.newPage();
   await page.goto("http://127.0.0.1:3001/login",{waitUntil:"load"});
   await page.waitForTimeout(1100);
   const shifts=await page.evaluate(()=>window.__cnttShifts||[]);
   console.log(JSON.stringify({width,iteration:k+1,cls:+shifts.reduce((s,v)=>s+v.value,0).toFixed(5),shifts:shifts.slice(0,5)}));
   await context.close();
  }
 }
} finally {await browser.close();}
