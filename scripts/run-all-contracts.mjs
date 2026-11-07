import fs from 'node:fs';
import { execSync } from 'node:child_process';

const tests = fs.readdirSync('tests').filter(f => f.endsWith('.mjs'));
let pass = 0, fail = 0;
const fails = [];
const nodePath = process.execPath;

console.log(`Running ${tests.length} contract tests...`);
for (let i = 0; i < tests.length; i++) {
  const t = tests[i];
  try {
    execSync(`"${nodePath}" "tests/${t}"`, { stdio: 'pipe' });
    pass++;
    process.stdout.write(`[${i+1}/${tests.length}] PASS: ${t}\n`);
  } catch (e) {
    fail++;
    const errMsg = e.stderr ? e.stderr.toString() : e.message;
    fails.push({ name: t, error: errMsg });
    process.stdout.write(`[${i+1}/${tests.length}] FAIL: ${t}\n${errMsg}\n`);
  }
}

console.log(`\n================================`);
console.log(`FINAL RESULT: ${pass} PASSED, ${fail} FAILED`);
console.log(`================================`);
if (fails.length) {
  process.exit(1);
}
