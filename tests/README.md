# Verification for the Unit 2 study tool

The tool generates its own problems, so nothing external tells us whether an
answer is right. These harnesses do — and one of them is a harness that tests
the harnesses.

## Running them

```bash
npm install -D playwright && npx playwright install chromium   # once
node tests/audit.js 500      # answers vs. the problems actually shown
node tests/pairing.js        # each answer paired with its own question
node tests/sabotage.js       # proves the two above can actually fail
node tests/selftest.js 300   # internal consistency of every generator
node tests/parser.js         # the tolerant answer grader
node tests/ui.js             # full walkthrough + screenshots into tests/shots/
node tests/concepts.js       # prints all 18 prose items for human review
```

Each script takes an optional path to the HTML file (defaults to
`college-algebra-unit2.html` next to this folder), so they work on any machine:

```bash
node tests/audit.js ~/Downloads/college-algebra-unit2.html 500
```

## What each one actually proves

**`audit.js` — is the answer correct for the problem on screen?**
Reads the *rendered question* back out of the page (unstacking fraction spans,
superscripts and radicals from the HTML a student reads), parses it into math,
and substitutes the tool's answer into it. For equations it also recovers the
polynomial coefficients independently and solves them, so a *missing* root fails
too, not just a wrong one. Points, lines, slopes, complex arithmetic,
discriminants and word problems each get their own check.

Crucially it never looks at the numbers the generator used to build the answer —
that is the whole point. The bug that shipped (`classify-eq` reversed a sign, so
the printed equation and the stated answer disagreed) was invisible to any check
that only compared the generator to itself.

A generator that verifies *zero* instances is reported as a hole, not a pass.

**`pairing.js` — is that answer attached to the right question?**
A correct answer on the wrong question is still wrong on test day. Checks the
printed answer key entry-by-entry against its questions, every results-review
row, the in-session feedback, and the flagged-correct multiple-choice option —
all read from the rendered DOM, compared on a rendering-independent signature
(the page draws `x²` and `√`; the internals say `x^2` and `sqrt(`).

**`sabotage.js` — can those two ever fail?**
Applies seven deliberate defects (the original sign bug, a broken distance
formula, `b² + 4ac` as the discriminant, `i² = +1`, a subtracting midpoint, a
dropped root, an answer key shifted by one) and asserts each is caught. If you
change the generators and a mutation's anchor text moves, that mutation reports
SKIPPED and the run fails — update it rather than deleting it.

**`selftest.js`** — internal consistency: the stated answer grades as correct,
exactly one MC option is right, distractors are genuinely wrong, no `NaN` or
`undefined` reaches the page, every alternate answer form is accepted.

**`parser.js`** — 91 cases for the tolerant grader: `2√13` / `2sqrt13` / `7.21`,
`{3, −5}` / `−5, 3`, `y = −x/2 − 1/8` / `8y = −4x − 1`, `no solution` / `∅` /
`DNE`, and the near-misses that must still be rejected.

**`concepts.js`** — dumps the 18 verbal items. No machine can check prose;
read them. Watch for distractors that are *true statements* — two slipped in
originally (polar-form multiplication is genuinely correct, just not taught in
2.4) and had to be replaced.

## Debug hooks in the page

`window.__audit(n)`, `window.__selftest(n)`, `window.__topics()`,
`window.__make(id)`, `window.__gallery()`, `window.__session()`,
`window.__sessionSet()`, `window.__printSet()`, `window.__gradeAgainst(spec, s)`.

They are inert during normal use and are what the harnesses drive.

## Known gap

`openstax.org` was unreachable from the environment where this was built
(egress policy), so answers were never cross-checked against the textbook's own
key. Substitution is a stronger check for *solving* problems — it verifies every
generated instance rather than the odd-numbered ones the book prints — but it
cannot tell you whether a problem **type** on the real test is missing from the
tool. That comparison still needs a human with the book open.
