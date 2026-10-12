export function parseOptions(args) {
  const options = {
    sessions: 40,
    baseUrl: 'http://localhost:5174',
    concurrency: 3,
    seed: 42,
    headed: false,
  };
  const names = {
    '--sessions': 'sessions',
    '--base-url': 'baseUrl',
    '--concurrency': 'concurrency',
    '--seed': 'seed',
  };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--headed') {
      options.headed = true;
      continue;
    }
    if (
      !Object.hasOwn(names, argument) ||
      args[index + 1] === undefined ||
      args[index + 1].startsWith('--')
    )
      throw new Error(`Unknown or missing flag: ${argument}`);
    options[names[argument]] = argument === '--base-url' ? args[++index] : Number(args[++index]);
  }
  for (const [name, max] of [
    ['sessions', 500],
    ['concurrency', 5],
    ['seed', 4294967295],
  ])
    if (
      !Number.isInteger(options[name]) ||
      options[name] < (name === 'seed' ? 0 : 1) ||
      options[name] > max
    )
      throw new Error(`Invalid ${name}: expected integer up to ${max}`);
  const url = new URL(options.baseUrl);
  if (!isLocalOrigin(url) || url.pathname !== '/' || url.search || url.hash)
    throw new Error('--base-url must be a local HTTP(S) origin for your demo');
  options.baseUrl = url.origin;
  return options;
}
export function isLocalOrigin(url) {
  return (
    ['http:', 'https:'].includes(url.protocol) &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    !url.username &&
    !url.password
  );
}
export function random(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
export function persona(randomValue) {
  return randomValue < 0.22
    ? 'bounce'
    : randomValue < 0.48
      ? 'researcher'
      : randomValue < 0.66
        ? 'buyer'
        : randomValue < 0.83
          ? 'abandoner'
          : 'mobile';
}
export class RateGate {
  constructor({
    interval = 350,
    now = Date.now,
    sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  } = {}) {
    this.interval = interval;
    this.now = now;
    this.sleep = sleep;
    this.next = 0;
    this.pauseUntil = 0;
    this.chain = Promise.resolve();
  }
  wait() {
    const slot = this.chain.then(async () => {
      let remaining = Math.max(this.next, this.pauseUntil) - this.now();
      while (remaining > 0) {
        await this.sleep(remaining);
        remaining = Math.max(this.next, this.pauseUntil) - this.now();
      }
      this.next = this.now() + this.interval;
    });
    this.chain = slot.catch(() => {});
    return slot;
  }
  backoff(seconds = 60) {
    this.interval = Math.min(2000, this.interval * 2);
    this.pauseUntil = Math.max(this.pauseUntil, this.now() + seconds * 1000);
  }
}
