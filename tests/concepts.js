const { openTool, targetFile, runsArg, loadPlaywright } = require("./lib");
const strip = s => String(s||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
(async () => {
  const { browser: b, page: p, errors: errs } = await openTool();
  const out = await p.evaluate(() => {
    const seen = {}, res = [];
    ['concept-21','concept-22','concept-24','concept-25'].forEach(id => {
      for (let k = 0; k < 400; k++) {
        const q = window.__make(id);
        if (seen[q.prompt]) continue;
        seen[q.prompt] = 1;
        res.push({ id, prompt:q.prompt, ans:q.ans, steps:q.steps,
                   wrong: q.mc.filter(m => !m.ok).map(m => m.v) });
      }
    });
    return res;
  });
  out.forEach((q,i) => {
    console.log('\n' + (i+1) + '. [' + q.id + '] ' + strip(q.prompt));
    console.log('   CORRECT: ' + strip(q.ans));
    q.wrong.forEach(w => console.log('   wrong:   ' + strip(w)));
  });
  console.log('\ntotal distinct items: ' + out.length);
  await b.close();
})();
