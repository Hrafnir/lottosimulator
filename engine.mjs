// Ordinær norsk Lotto, Norsk Tippings spilleregler § 3.2.1 (2026).
const BALLS = Array.from({ length: 34 }, (_, index) => index + 1);
const ROW_LENGTH = 7;
const TICKET_SIZE = 10;
const ROW_PRICE = 5;
const PRIZE_POOL_SHARE = 0.5;
export const WEEK_COST = TICKET_SIZE * ROW_PRICE;
export const MAX_WEEKS = 52000;

function combinations(n, k) {
  let count = 1;
  for (let i = 1; i <= k; i++) count = count * (n - i + 1) / i;
  return count;
}

const possibleRows = combinations(BALLS.length, ROW_LENGTH);
const otherBalls = BALLS.length - ROW_LENGTH;

// Share is expressed as a percentage of the entire prize pool, including
// Supertrekning. For six matches, exactly one of the other balls is the bonus.
export const TIERS = [
  { label: '7 rette', share: 37.2, outcomes: 1 },
  { label: '6 rette + tilleggstall', share: 5.25, outcomes: ROW_LENGTH },
  { label: '6 rette', share: 5.5, outcomes: ROW_LENGTH * (otherBalls - 1) },
  { label: '5 rette', share: 6.0, outcomes: combinations(7, 5) * combinations(otherBalls, 2) },
  { label: '4 rette', share: 38.7, outcomes: combinations(7, 4) * combinations(otherBalls, 3) }
].map(({ label, share, outcomes }) => {
  const probability = outcomes / possibleRows;
  const estimate = ROW_PRICE * PRIZE_POOL_SHARE * (share / 100) / probability;
  return { label, share, prize: 5 * Math.floor(estimate / 5) };
});

// A partial Fisher–Yates shuffle samples uniformly without replacement.
function sampleBalls(count) {
  const pool = BALLS.slice();
  for (let i = 0; i < count; i++) {
    const chosen = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[chosen]] = [pool[chosen], pool[i]];
  }
  return pool.slice(0, count);
}

const ascending = (a, b) => a - b;

export function drawWeek() {
  const main = sampleBalls(ROW_LENGTH + 1);
  const bonus = main.pop();
  main.sort(ascending);
  return { main, bonus };
}

export function makeTicket() {
  const ticket = [];
  const keys = new Set();
  while (ticket.length < TICKET_SIZE) {
    const row = sampleBalls(ROW_LENGTH).sort(ascending);
    const key = row.join(',');
    if (!keys.has(key)) {
      keys.add(key);
      ticket.push(row);
    }
  }
  return ticket;
}

function evaluate(row, mainSet, bonusBall) {
  let matches = 0;
  for (const ball of row) {
    if (mainSet.has(ball)) matches++;
  }
  const bonus = row.includes(bonusBall);
  let tier = null;
  if (matches === 7) tier = 0;
  else if (matches === 6) tier = bonus ? 1 : 2;
  else if (matches === 5) tier = 3;
  else if (matches === 4) tier = 4;
  return { matches, bonus, tier };
}

export function scoreRow(row, draw) {
  return evaluate(row, new Set(draw.main), draw.bonus);
}

function isValidRow(row) {
  return Array.isArray(row) && row.length === ROW_LENGTH &&
    row.every(ball => Number.isInteger(ball) && ball >= 1 && ball <= BALLS.length) &&
    new Set(row).size === ROW_LENGTH;
}

export function simulate(ticket, weeks) {
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > MAX_WEEKS) {
    throw new RangeError('Antall uker må være et heltall mellom 1 og 52 000.');
  }
  if (!Array.isArray(ticket) || ticket.length !== TICKET_SIZE || !ticket.every(isValidRow)) {
    throw new RangeError('Kupongen må ha ti rekker med sju forskjellige tall fra 1 til 34.');
  }
  const keys = ticket.map(row => [...row].sort(ascending).join(','));
  if (new Set(keys).size !== TICKET_SIZE) {
    throw new RangeError('Alle ti rekker må være forskjellige.');
  }

  const draws = [];
  const counts = TIERS.map(() => 0);
  let totalPrize = 0;
  for (let week = 0; week < weeks; week++) {
    const draw = drawWeek();
    const mainSet = new Set(draw.main);
    let payout = 0;
    for (const row of ticket) {
      const { tier } = evaluate(row, mainSet, draw.bonus);
      if (tier !== null) {
        counts[tier]++;
        payout += TIERS[tier].prize;
      }
    }
    draws.push({ ...draw, payout });
    totalPrize += payout;
  }
  return { draws, counts, totalPrize, totalCost: weeks * WEEK_COST };
}
