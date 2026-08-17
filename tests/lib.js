/* Shared setup for the verification harnesses.
   Works on any machine: finds Playwright wherever it is installed, and
   resolves the tool under test from argv, $TOOL, or the repo default. */
const path = require("path");
const fs = require("fs");

function loadPlaywright(){
  const tries = ["playwright", "@playwright/test", "/opt/node22/lib/node_modules/playwright"];
  for(const t of tries){
    try { return require(t); } catch(e){ /* keep looking */ }
  }
  console.error(
    "Playwright not found. Install it first:\n" +
    "  npm install -D playwright && npx playwright install chromium\n");
  process.exit(2);
}

function targetFile(){
  const fromArg = process.argv.find(a => a.endsWith(".html"));
  const file = fromArg || process.env.TOOL ||
    path.join(__dirname, "..", "college-algebra-unit2.html");
  const abs = path.resolve(file);
  if(!fs.existsSync(abs)){
    console.error("Cannot find the tool at " + abs +
      "\nPass a path: node tests/audit.js path/to/college-algebra-unit2.html");
    process.exit(2);
  }
  return "file://" + abs;
}

/* first numeric argument, else fallback */
function runsArg(fallback){
  const n = process.argv.slice(2).map(Number).find(v => Number.isFinite(v) && v > 0);
  return n || fallback;
}

async function openTool(){
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1000, height:1400 } });
  const errors = [];
  page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
  page.on("console", m => {
    // the Google Fonts stylesheet is unreachable offline; that is not a defect
    if(m.type() === "error" && !/ERR_CONNECTION|net::|Failed to load resource/.test(m.text()))
      errors.push("CONSOLE: " + m.text());
  });
  await page.goto(targetFile());
  await page.waitForTimeout(300);
  return { browser, page, errors };
}

module.exports = { loadPlaywright, targetFile, runsArg, openTool };
