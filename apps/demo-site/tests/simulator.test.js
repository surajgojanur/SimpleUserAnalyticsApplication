import test from 'node:test';
import assert from 'node:assert/strict';
test('seeded simulator choices and local-only flags are validated', async () => {
  const { parseOptions, random, persona, RateGate } = await import('../scripts/simulation.js');
  assert.deepEqual(
    parseOptions([
      '--sessions',
      '4',
      '--concurrency',
      '2',
      '--seed',
      '7',
      '--headed',
      '--base-url',
      'http://localhost:5174',
    ]),
    { sessions: 4, concurrency: 2, seed: 7, headed: true, baseUrl: 'http://localhost:5174' },
  );
  for (const args of [
    ['--sessions', '0'],
    ['--base-url', 'https://example.com'],
    ['--concurrency', '20'],
    ['--seed', 'NaN'],
    ['--unknown'],
  ])
    assert.throws(() => parseOptions(args));
  const a = random(42),
    b = random(42);
  assert.deepEqual(
    Array.from({ length: 40 }, () => persona(a())),
    Array.from({ length: 40 }, () => persona(b())),
  );
  let time = 0;
  const waits = [];
  const gate = new RateGate({
    interval: 350,
    now: () => time,
    sleep: async (ms) => {
      waits.push(ms);
      time += ms;
    },
  });
  await Promise.all([gate.wait(), gate.wait(), gate.wait()]);
  assert.equal(time, 700);
  gate.backoff(60);
  await gate.wait();
  assert.equal(time, 60700);
  assert.deepEqual(waits, [350, 350, 60000]);
});
