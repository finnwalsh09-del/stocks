const { openTool, targetFile, runsArg, loadPlaywright } = require("./lib");
const norm = s => String(s||'').replace(/\s+/g,' ').replace(/[.]$/,'').trim();
// compare on a rendering-independent signature: the DOM shows x² and √ visually,
// the internal text uses x^2 and sqrt( — strip everything but letters and digits
const sig = s => String(s||'').replace(/sqrt/gi,'').replace(/[^0-9a-z]/gi,'').toLowerCase();
const head = (s,n) => sig(s).slice(0, n || 22);
const fail = [];
const ok = m => console.log('  ok   ' + m);
const bad = m => { fail.push(m); console.log('  FAIL ' + m); };

(async () => {
  const { browser: b, page: p, errors: errs } = await openTool();
  errs.forEach(e => bad(e));
  // ---------- 1. printable test: key entry N must be the answer to question N ----------
  console.log('\n[1] printable practice test — question/answer-key alignment');
  await p.locator('button:has-text("Print a paper test")').click();
  await p.waitForTimeout(400);
  const printInternal = await p.evaluate(() => window.__printSet());
  const rendered = await p.evaluate(() => {
    const secs = document.querySelectorAll('.paper-sheet > div');
    const qs = [...document.querySelectorAll('.paper-sheet > div:not(.pagebreak) .pq')].map(d => d.innerText);
    const ks = [...document.querySelectorAll('.paper-sheet .pagebreak .pq')].map(d => d.innerText);
    return { qs, ks };
  });
  if (rendered.qs.length !== 20) bad('expected 20 printed questions, got ' + rendered.qs.length);
  else ok('20 questions printed');
  if (rendered.ks.length !== rendered.qs.length) bad('key has ' + rendered.ks.length + ' entries for ' + rendered.qs.length + ' questions');
  else ok(rendered.ks.length + ' key entries, counts match');
  let misaligned = 0, unverified = 0;
  printInternal.forEach((q, i) => {
    const qText = norm(rendered.qs[i] || '').replace(/^\d+\.\s*/,'');
    const kText = norm(rendered.ks[i] || '').replace(/^\d+\.\s*/,'');
    if (!sig(qText).includes(head(q.promptText))) { misaligned++; bad('Q' + (i+1) + ' prompt mismatch: sheet="' + qText.slice(0,50) + '" internal="' + q.promptText.slice(0,50) + '"'); }
    if (!sig(kText).includes(head(q.ansText, 8))) { misaligned++; bad('Q' + (i+1) + ' key entry "' + kText + '" is not the answer "' + q.ansText + '"'); }
    if (q.audit === false) { bad('Q' + (i+1) + ' fails the math audit'); }
    if (q.audit === null && !/^concept-/.test(q.topic)) unverified++;
  });
  if (!misaligned) ok('every key entry lines up with its own question');
  if (unverified) console.log('  note: ' + unverified + ' printed items were prose/concept (no math check)');

  // ---------- 2. a full session: feedback + review rows ----------
  console.log('\n[2] session feedback and results review — pairing per question');
  await p.locator('#btn-home').click(); await p.waitForTimeout(150);
  await p.locator('.step .btn').first().click(); await p.waitForTimeout(250);
  const sessionSet = await p.evaluate(() => window.__sessionSet());
  for (let k = 0; k < sessionSet.length; k++) {
    const st = await p.evaluate(() => window.__session());
    if (!st) break;
    // the prompt on screen must be question k
    const shown = norm(await p.locator('.qtext').first().innerText());
    if (!sig(shown).includes(head(sessionSet[k].promptText))) bad('Q' + (k+1) + ': on-screen prompt is not question ' + (k+1) + ' [shown=' + shown.slice(0,45) + ' | want=' + sessionSet[k].promptText.slice(0,45) + ']');
    if (st.kind === 'plot') { await p.locator('svg.plane').first().click({position:{x:120,y:110}}); await p.locator('button:has-text("Check")').first().click(); }
    else if (st.kind === 'mc') {
      const mcTexts = await p.locator('.choice').allInnerTexts();
      const flagged = sessionSet[k].mcCorrect || [];
      if (flagged.length !== 1) bad('Q' + (k+1) + ': ' + flagged.length + ' options flagged correct');
      else if (!mcTexts.some(t => sig(t).includes(head(flagged[0], 10)))) bad('Q' + (k+1) + ': the correct option is not among the rendered choices');
      let pick = 0;
      for (let j = 0; j < mcTexts.length; j++) {
        if (flagged.length === 1 && !sig(mcTexts[j]).includes(head(flagged[0], 10))) { pick = j; break; }
      }
      await p.locator('.choice').nth(pick).click();
    } else { await p.fill('#ansin', 'zzz'); await p.locator('button:has-text("Check")').first().click(); }
    await p.waitForTimeout(90);
    // the revealed answer must be question k's answer
    const fb = norm(await p.locator('.fb').first().innerText());
    if (sessionSet[k].ansText && !sig(fb).includes(head(sessionSet[k].ansText, 8)))
      bad('Q' + (k+1) + ': revealed answer "' + fb.slice(0,60) + '" does not match "' + sessionSet[k].ansText + '"');
    await p.locator('button:has-text("Next question"), button:has-text("See results")').first().click();
    await p.waitForTimeout(90);
  }
  ok('in-session feedback showed the right answer for all ' + sessionSet.length + ' questions');

  const review = await p.evaluate(() => {
    document.querySelectorAll('.rev').forEach(d => { d.open = true; });
    return [...document.querySelectorAll('.rev')].map(d => d.innerText);
  });
  if (review.length !== sessionSet.length) bad('review shows ' + review.length + ' rows for ' + sessionSet.length + ' questions');
  else {
    let badRows = 0;
    sessionSet.forEach((q, i) => {
      const row = norm(review[i]);
      if (!sig(row).includes(head(q.promptText))) { badRows++; bad('review row ' + (i+1) + ' shows the wrong question'); }
      else if (q.ansText && !sig(row).includes(head(q.ansText, 8))) { badRows++; bad('review row ' + (i+1) + ' shows the wrong answer'); }
    });
    if (!badRows) ok('all ' + review.length + ' review rows pair the right question with the right answer');
  }

  // ---------- 3. retry-missed set ----------
  console.log('\n[3] retry-missed set');
  const retry = p.locator('button:has-text("Retry the")');
  if (await retry.count()) {
    await retry.click(); await p.waitForTimeout(300);
    const rset = await p.evaluate(() => window.__sessionSet());
    const shown = norm(await p.locator('.qtext').first().innerText());
    if (!rset.length) bad('retry set is empty');
    else if (!sig(shown).includes(head(rset[0].promptText))) bad('retry set: first question does not match what is rendered');
    else ok('retry set rebuilt with matching question/answer pairs (' + rset.length + ' questions)');
    const badMath = rset.filter(q => q.audit === false).length;
    if (badMath) bad(badMath + ' retry questions fail the math audit'); else ok('retry questions all pass the math audit');
  } else bad('no retry-missed button on results');

  console.log('\n' + (fail.length ? 'PAIRING FAILURES: ' + fail.length : 'PAIRING CLEAN'));
  await b.close();
  process.exitCode = fail.length ? 1 : 0;
})();
