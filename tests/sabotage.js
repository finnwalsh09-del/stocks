/* Tests the tests.
   A verification harness that cannot fail is worthless. This deliberately breaks
   the tool in ways that have actually happened (or plausibly could), and asserts
   that audit.js / pairing.js catch each one. Every mutation must be DETECTED. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { targetFile } = require("./lib");

const SRC = targetFile().replace("file://", "");
const source = fs.readFileSync(SRC, "utf8");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "algebra-sabotage-"));

const MUTATIONS = [
  { name: "classify-eq: reversed sign (the bug that shipped)",
    from: "const c = a*s + b - d*s;",
    to:   "const c = d*s + b - a*s;",
    by:   "audit" },
  { name: "distance: subtracts the squares instead of adding",
    from: "const dx = x2-x1, dy = y2-y1, d2 = dx*dx + dy*dy;\n  if(dx === 0 || dy === 0) return null;",
    to:   "const dx = x2-x1, dy = y2-y1, d2 = dx*dx - dy*dy + 50;\n  if(dx === 0 || dy === 0) return null;",
    by:   "audit" },
  { name: "quadratic formula: discriminant b^2 + 4ac",
    from: "const D = b*b - 4*a*c;\n  if(D === 0) return null;\n  const rounded",
    to:   "const D = b*b + 4*a*c;\n  if(D === 0) return null;\n  const rounded",
    by:   "audit" },
  { name: "complex multiplication: i^2 treated as +1",
    from: "const rr = a*c - b*d, ri = a*d + b*c;",
    to:   "const rr = a*c + b*d, ri = a*d + b*c;",
    by:   "audit" },
  { name: "midpoint: subtracts instead of averaging",
    from: "const mxN = x1+x2, myN = y1+y2;",
    to:   "const mxN = x1-x2, myN = y1+y2;",
    by:   "audit" },
  { name: "factoring: drops one of the two roots",
    from: "function rootsT(r, s){\n  if(Math.abs(r - s) < 1e-12) return \"x = \" + nn(r);",
    to:   "function rootsT(r, s){\n  if(true) return \"x = \" + nn(r);",
    by:   "audit" },
  { name: "printed answer key shifted by one",
    from: "    d.innerHTML = '<span class=\"pn\">' + (k+1) + \".</span> \" + mt(q.ansHtml || q.ans);",
    to:   "    d.innerHTML = '<span class=\"pn\">' + (k+1) + \".</span> \" + mt(picks[(k+1) % picks.length].ans);",
    by:   "pairing" },
];

let missed = 0;
console.log("Each mutation below must be DETECTED by the harness.\n");

MUTATIONS.forEach(function(m, i){
  if(source.indexOf(m.from) < 0){
    console.log("  ?? SKIPPED  " + m.name + "\n     (anchor text not found — the code moved; update this mutation)");
    missed++;
    return;
  }
  const file = path.join(tmp, "mutant" + i + ".html");
  fs.writeFileSync(file, source.replace(m.from, m.to));
  const runs = m.by === "audit" ? ["audit.js", file, "150"] : ["pairing.js", file];
  let caught = false, output = "";
  try {
    output = execFileSync(process.execPath, [path.join(__dirname, runs[0])].concat(runs.slice(1)),
                          { encoding:"utf8", stdio:["ignore","pipe","pipe"] });
  } catch(e){
    caught = true;                       // non-zero exit == the harness objected
    output = String(e.stdout || "");
  }
  if(caught){
    const first = (output.split("\n").filter(function(l){ return /WRONG ANSWER|FAIL|NOT VERIFIED/.test(l); })[0] || "").trim();
    console.log("  ✓ caught by " + m.by.padEnd(8) + m.name + (first ? "\n              → " + first.slice(0, 90) : ""));
  } else {
    missed++;
    console.log("  ✗ MISSED by " + m.by.padEnd(8) + m.name);
  }
});

fs.rmSync(tmp, { recursive:true, force:true });
console.log("\n" + (missed ? missed + " MUTATION(S) NOT CAUGHT — the harness has a blind spot"
                           : "All " + MUTATIONS.length + " mutations caught."));
process.exitCode = missed ? 1 : 0;
