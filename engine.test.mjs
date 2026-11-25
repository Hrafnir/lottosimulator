import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_WEEKS, TIERS, WEEK_COST, drawWeek, makeTicket, scoreRow, simulate } from './engine.mjs';

test('ten distinct fixed rows and eight distinct drawn numbers from 1–34', () => {
  const ticket = makeTicket();
  assert.equal(ticket.length, 10);
  assert.equal(new Set(ticket.map(row => row.join(','))).size, 10);
  for (const row of ticket) {
    assert.equal(row.length, 7);
    assert.equal(new Set(row).size, 7);
    assert.ok(row.every((n, i) => n >= 1 && n <= 34 && (i === 0 || n > row[i - 1])));
  }
  for (let n = 0; n < 100; n++) {
    const { main, bonus } = drawWeek();
    assert.equal(main.length, 7);
    assert.equal(new Set([...main, bonus]).size, 8);
    assert.ok([...main, bonus].every(n => n >= 1 && n <= 34));
    assert.deepEqual(main, [...main].sort((a, b) => a - b));
  }
});

test('each winning row receives exactly its highest ordinary prize', () => {
  const draw = { main: [1, 2, 3, 4, 5, 6, 7], bonus: 34 };
  const cases = [
    [[1, 2, 3, 4, 5, 6, 7], 7, false, 0],
    [[1, 2, 3, 4, 5, 6, 34], 6, true, 1],
    [[1, 2, 3, 4, 5, 6, 8], 6, false, 2],
    [[1, 2, 3, 4, 5, 9, 34], 5, true, 3],
    [[1, 2, 3, 4, 10, 9, 34], 4, true, 4],
    [[1, 2, 3, 11, 10, 9, 34], 3, true, null]
  ];
  for (const [row, matches, bonus, tier] of cases) {
    assert.deepEqual(scoreRow(row, draw), { matches, bonus, tier });
  }
});

test('2026 reference rates and prize accounting', () => {
  assert.equal(WEEK_COST, 50);
  assert.deepEqual(TIERS.map(t => t.prize), [5003040, 100865, 4060, 105, 50]);
  const ticket = makeTicket().map(Object.freeze);
  Object.freeze(ticket);
  const result = simulate(ticket, 520);
  const counts = TIERS.map(() => 0);
  for (const draw of result.draws) {
    let expected = 0;
    for (const row of ticket) {
      const { tier } = scoreRow(row, draw);
      if (tier !== null) {
        counts[tier]++;
        expected += TIERS[tier].prize;
      }
    }
    assert.equal(draw.payout, expected);
  }
  assert.equal(result.draws.length, 520);
  assert.deepEqual(result.counts, counts);
  assert.equal(result.totalCost, 26000);
  assert.equal(result.totalPrize, TIERS.reduce((n, t, i) => n + t.prize * counts[i], 0));
});

test('only supported week counts and ten valid distinct rows are accepted', () => {
  const ticket = makeTicket();
  for (const weeks of [0, -1, 1.5, MAX_WEEKS + 1, NaN, Infinity]) {
    assert.throws(() => simulate(ticket, weeks), RangeError);
  }
  assert.equal(simulate(ticket, 1).totalCost, 50);
  assert.throws(() => simulate([], 1), RangeError);
  assert.throws(() => simulate([...ticket.slice(1), [...ticket[1]].reverse()], 1), RangeError);
  assert.throws(() => simulate([...ticket.slice(1), [0, 1, 2, 3, 4, 5, 6]], 1), RangeError);
});
