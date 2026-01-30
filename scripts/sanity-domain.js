const { normalizeTarget } = require('../app/util/domain');

const cases = [
  { input: 'example.com', ok: true, expected: 'example.com' },
  { input: 'Sub.Example.COM', ok: true, expected: 'sub.example.com' },
  { input: 'example.com.', ok: true, expected: 'example.com' },
  { input: 'xn--bcher-kva.example', ok: true, expected: 'xn--bcher-kva.example' },
  { input: 'http://example.com', ok: false },
  { input: 'example.com/path', ok: false },
  { input: 'exa mple.com', ok: false },
  { input: 'example..com', ok: false },
  { input: '-example.com', ok: false },
  { input: 'example-.com', ok: false },
  { input: '1.2.3.4', ok: false },
  { input: '例え.テスト', ok: false },
  { input: 'example.com:8080', ok: false }
];

let failed = 0;
for (const test of cases) {
  try {
    const result = normalizeTarget(test.input);
    if (!test.ok) {
      console.error(`FAIL: expected error for ${test.input}`);
      failed += 1;
      continue;
    }
    if (result !== test.expected) {
      console.error(`FAIL: ${test.input} => ${result}, expected ${test.expected}`);
      failed += 1;
    } else {
      console.log(`PASS: ${test.input} => ${result}`);
    }
  } catch (err) {
    if (test.ok) {
      console.error(`FAIL: ${test.input} threw ${err.message}`);
      failed += 1;
    } else {
      console.log(`PASS: ${test.input} rejected (${err.message})`);
    }
  }
}

if (failed > 0) {
  process.exit(1);
}
