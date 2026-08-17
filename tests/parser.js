const { openTool, targetFile, runsArg, loadPlaywright } = require("./lib");
const CASES = [
  // [spec, [inputs that must be ACCEPTED], [inputs that must be REJECTED]]
  [{kind:'num', ans:'x = 3, x = −5'}, ['3, -5','-5, 3','{3, -5}','x=3, x=-5','3 and -5','3 or -5','x = 3, x = −5'], ['3','3, 5','-3, 5','']],
  [{kind:'num', ans:'2√13', tol:0.0051}, ['2sqrt13','2 sqrt(13)','2√13','7.21','sqrt(52)'], ['26','2√14','13','7.3']],
  [{kind:'num', ans:'x = 5 ± 2√3'}, ['5 ± 2√3','5+2sqrt3, 5-2sqrt3','5 - 2√3, 5 + 2√3','x = 5 + 2root3, x = 5 - 2root3'], ['5 + 2√3','5 ± √3']],
  [{kind:'num', ans:'20/29 + 21/29i'}, ['20/29+21/29i','(20+21i)/29','21/29i + 20/29'], ['20/29 - 21/29i','29/20 + 29/21i']],
  [{kind:'num', ans:'8 − i'}, ['8-i','-i+8','8 - 1i','8-1i'], ['8+i','7','8i-1']],
  [{kind:'num', ans:'7i√11'}, ['7i√11','7isqrt(11)','i√539','sqrt(-539)'], ['7√11','-7i√11','11i√7']],
  [{kind:'num', ans:'no solution'}, ['no solution','none','No Solutions','∅','DNE','no real solutions'], ['0','x = 0','all real numbers']],
  [{kind:'num', ans:'undefined', accept:['undefined']}, ['undefined','no slope','DNE','Undefined'], ['0','1']],
  [{kind:'num', ans:'−3/2'}, ['-3/2','-1.5','−3/2','-6/4'], ['3/2','-2/3','-1.6']],
  [{kind:'line', ans:'y = −1/2x − 1/8'}, ['y=-x/2-1/8','y = -0.5x - 0.125','8y = -4x - 1','y=-1/2x-1/8','y + 1/8 = -1/2x'], ['y=1/2x-1/8','y=-1/2x+1/8','y=-2x-1/8']],
  [{kind:'line', ans:'x = −4'}, ['x=-4','x = −4'], ['y=-4','x=4']],
  [{kind:'tuple', ans:'(−3/2, 0)', single:0}, ['(-3/2, 0)','-3/2','(-1.5, 0)','-1.5','(−3/2,0)'], ['(0, -3/2)','3/2','(-3, 0)']],
  [{kind:'text', ans:'Parallel'}, ['parallel','Parallel'], ['perpendicular','neither']]
];
(async () => {
  const { browser: b, page: p, errors: errs } = await openTool();
  const bad = await p.evaluate(cases => {
    const out = [];
    cases.forEach(([spec, good, wrong]) => {
      good.forEach(g => { const r = window.__gradeAgainst(Object.assign({}, spec), g);
        if(!r.ok) out.push('REJECTED valid: "' + g + '"  (ans ' + spec.ans + ')'); });
      wrong.forEach(w => { const r = window.__gradeAgainst(Object.assign({}, spec), w);
        if(r.ok) out.push('ACCEPTED invalid: "' + w + '"  (ans ' + spec.ans + ')'); });
    });
    return out;
  }, CASES);
  const total = CASES.reduce((n,c)=>n+c[1].length+c[2].length,0);
  console.log('parser cases: ' + total + ', failures: ' + bad.length);
  bad.forEach(x => console.log('  • ' + x));
  await b.close();
  process.exitCode = bad.length ? 1 : 0;
})();
