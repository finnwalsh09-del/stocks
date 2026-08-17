const { openTool, targetFile, runsArg, loadPlaywright } = require("./lib");
const DIR = require('path').join(__dirname, 'shots') + '/';
require('fs').mkdirSync(DIR, {recursive:true});
(async () => {
  const { browser: b, page: p, errors: errs } = await openTool();
  await p.screenshot({ path: DIR+'1-home-light.png', fullPage:true });

  // start the diagnostic
  await p.locator('.step .btn').first().click();
  await p.waitForTimeout(200);
  await p.screenshot({ path: DIR+'2-question.png', fullPage:true });

  // answer 12 questions: deliberately wrong on the first, then a mix
  for (let k = 0; k < 12; k++) {
    const state = await p.evaluate(() => {
      const q = window.__session();
      return q ? { kind:q.kind, mc: !!q.mc, ans:q.ans, idx:q.idx, n:q.n } : null;
    });
    if (!state) break;
    if (state.kind === 'plot') {
      const svg = p.locator('svg.plane').first();
      await svg.click({ position:{x:120, y:110} });
      await p.locator('button:has-text("Check")').first().click();
    } else if (state.kind === 'mc') {
      await p.locator('.choice').nth(k % 3).click();
    } else {
      // first one wrong on purpose, the rest correct
      await p.fill('#ansin', k === 0 ? '99' : state.ans);
      await p.locator('button:has-text("Check")').first().click();
    }
    await p.waitForTimeout(120);
    if (k === 0) await p.screenshot({ path: DIR+'3-wrong-with-steps.png', fullPage:true });
    if (state.kind === 'plot') await p.screenshot({ path: DIR+'4-plot.png', fullPage:true });
    await p.locator('button:has-text("Next question"), button:has-text("See results")').first().click();
    await p.waitForTimeout(120);
  }
  await p.screenshot({ path: DIR+'5-results.png', fullPage:true });

  // reference sheet in dark mode
  await p.locator('#btn-home').click(); await p.waitForTimeout(150);
  await p.locator('#btn-theme').click(); await p.waitForTimeout(150);
  await p.screenshot({ path: DIR+'6-home-dark.png', fullPage:true });
  await p.locator('button:has-text("Formula sheet")').click(); await p.waitForTimeout(200);
  await p.screenshot({ path: DIR+'7-reference-dark.png', fullPage:true });

  // progress + print views
  await p.locator('#btn-home').click(); await p.waitForTimeout(150);
  await p.locator('button:has-text("Progress")').click(); await p.waitForTimeout(200);
  await p.screenshot({ path: DIR+'8-progress.png', fullPage:true });
  await p.locator('#btn-home').click(); await p.waitForTimeout(150);
  await p.locator('button:has-text("Print a paper test")').click(); await p.waitForTimeout(300);
  await p.screenshot({ path: DIR+'9-print.png', fullPage:true });

  // persistence across reload
  await p.reload(); await p.waitForTimeout(300);
  const persisted = await p.evaluate(() => {
    const raw = localStorage.getItem('ca-unit2-v1');
    const s = raw ? JSON.parse(raw) : null;
    return s ? { topics:Object.keys(s.topics||{}).length, sessions:(s.sessions||[]).length, diag: !!(s.plan&&s.plan.diag) } : null;
  });
  console.log('persistence:', JSON.stringify(persisted));

  // phone width
  const p2 = await b.newPage({ viewport:{width:390, height:844}, deviceScaleFactor:2 });
  p2.on('pageerror', e => errs.push('MOBILE PAGEERROR: ' + e.message));
  await p2.goto(targetFile());
  await p2.waitForTimeout(300);
  await p2.screenshot({ path: DIR+'10-mobile-home.png', fullPage:true });
  await p2.locator('.step .btn').first().click(); await p2.waitForTimeout(250);
  await p2.screenshot({ path: DIR+'11-mobile-question.png', fullPage:true });
  const overflow = await p2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  console.log('mobile horizontal overflow:', overflow);

  console.log('errors:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
