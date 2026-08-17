const { openTool, targetFile, runsArg, loadPlaywright } = require("./lib");
(async () => {
  const { browser: b, page: p, errors: errs } = await openTool();
  const res = await p.evaluate(n => window.__selftest(n), runsArg(300));
  console.log('topics:', res.topics, 'runs each:', res.runs);
  if (errs.length) console.log('\n--- page errors ---\n' + errs.slice(0,10).join('\n'));
  if (res.problems.length) {
    console.log('\n--- PROBLEMS (' + res.problems.length + ' shown) ---');
    res.problems.forEach(x => console.log(' • ' + x));
    process.exitCode = 1;
  } else console.log('\nALL CLEAN');
  await b.close();
})();
