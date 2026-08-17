const { openTool, targetFile, runsArg, loadPlaywright } = require("./lib");
(async () => {
  const { browser: b, page: p, errors: errs } = await openTool();
  const res = await p.evaluate(n => window.__audit(n), runsArg(500));
  const rows = Object.keys(res.stats).map(id => {
    const s = res.stats[id];
    return { id, ok:s.ok, bad:s.bad, skip:s.skip, concept:s.concept };
  });
  console.log('runs per generator:', res.runs);
  console.log('\nid                      verified   wrong  unchecked');
  rows.forEach(r => console.log(
    '  ' + r.id.padEnd(20) + String(r.ok).padStart(8) + String(r.bad).padStart(8) +
    String(r.skip).padStart(10) + (r.concept ? '   (prose — reviewed by hand)' : '')));
  if (errs.length) console.log('\npage errors: ' + errs.slice(0,5).join(' | '));
  if (res.problems.length) {
    console.log('\n--- PROBLEMS (' + res.problems.length + ') ---');
    res.problems.forEach(x => console.log('  • ' + x));
    process.exitCode = 1;
  } else console.log('\nAUDIT CLEAN');
  await b.close();
})();
