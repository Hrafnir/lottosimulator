import { drawWeek, makeTicket, scoreRow, simulate, MAX_WEEKS, TIERS, WEEK_COST } from './engine.mjs';

const byId = id => document.getElementById(id);
const format = new Intl.NumberFormat('nb-NO');
const money = value => format.format(value) + ' kr';
const weeksLabel = value => format.format(value) + (value === 1 ? ' uke' : ' uker');
const twoDigits = value => String(value).padStart(2, '0');
const storageKey = 'lottosimulator.ticket.v1';

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value !== undefined) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function validTicket(rows) {
  return Array.isArray(rows) && rows.length === 10 &&
    rows.every(row => Array.isArray(row) && row.length === 7 &&
      row.every(n => Number.isInteger(n) && n >= 1 && n <= 34) && new Set(row).size === 7) &&
    new Set(rows.map(row => [...row].sort((a, b) => a - b).join(','))).size === 10;
}

function saveTicket(rows) {
  try { localStorage.setItem(storageKey, JSON.stringify(rows)); } catch { /* In-memory ticket still works. */ }
}

function loadTicket() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (validTicket(stored)) return stored.map(row => row.sort((a, b) => a - b));
  } catch { /* Fall back to a fresh ticket if storage is unavailable. */ }
  const rows = makeTicket();
  saveTicket(rows);
  return rows;
}

const ticket = loadTicket();
let result = null;
let selectedWeek = 0;
let draft = new Set();
const weeksInput = byId('weeks');
const drawInput = byId('select-week');
const setupForm = byId('setup');
const weekError = 'Skriv et helt antall uker fra 1 til 52 000.';

function chosenWeeks() {
  const number = weeksInput.valueAsNumber;
  return Number.isInteger(number) && number >= 1 && number <= MAX_WEEKS ? number : null;
}

function renderPlan(showError = false) {
  const weeks = chosenWeeks();
  byId('planned').textContent = weeks === null ? '—' : money(weeks * WEEK_COST);
  byId('validation').textContent = showError && !weeks ? weekError : '';
  weeksInput.setAttribute('aria-invalid', String(showError && !weeks));
  for (const button of byId('presets').querySelectorAll('[data-weeks]')) {
    const active = Number(button.dataset.weeks) === weeks;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('active', active);
  }
}

function renderTicket(draw) {
  const rows = ticket.map((numbers, index) => {
    const row = element('div', undefined, 'ticket-row');
    const label = element('span', twoDigits(index + 1), 'row-label');
    label.setAttribute('aria-label', 'Rekke ' + (index + 1));
    const balls = element('div', undefined, 'row-balls');
    for (const number of numbers) {
      const ball = element('span', twoDigits(number), 'ticket-ball');
      if (draw?.main.includes(number)) {
        ball.classList.add('hit');
        ball.setAttribute('aria-label', number + ', treff');
      } else if (draw?.bonus === number) {
        ball.classList.add('extra');
        ball.setAttribute('aria-label', number + ', tilleggstall');
      }
      balls.append(ball);
    }
    const score = draw ? scoreRow(numbers, draw) : null;
    const matches = element('span', score ? String(score.matches) : '—', 'row-result');
    if (score) {
      matches.setAttribute('aria-label', score.matches + ' rette' + (score.bonus ? ' og tilleggstall' : ''));
      if (score.tier !== null) {
        row.classList.add('winning');
        matches.classList.add('win');
        matches.title = TIERS[score.tier].label + ' · ' + money(TIERS[score.tier].prize);
      }
      if (score.tier === 1) matches.textContent = '6 + T';
    }
    row.append(label, balls, matches);
    return row;
  });
  byId('ticket-rows').replaceChildren(...rows);
}

function renderDraw() {
  const draw = result?.draws[selectedWeek];
  const count = result?.draws.length ?? 0;
  byId('draw-label').textContent = draw ? 'Uke ' + format.format(selectedWeek + 1) + ' av ' + format.format(count) : 'Ingen trekning ennå';
  const balls = (draw?.main ?? Array(7).fill(null)).map(n =>
    element('span', n === null ? '–' : twoDigits(n), 'draw-ball' + (draw ? '' : ' empty')));
  const plus = element('span', '+', 'draw-plus');
  plus.setAttribute('aria-hidden', 'true');
  const bonus = element('span', draw ? twoDigits(draw.bonus) : '–', 'draw-ball bonus' + (draw ? '' : ' empty'));
  const wrapper = byId('draw-balls');
  wrapper.replaceChildren(...balls, plus, bonus);
  wrapper.setAttribute('role', 'img');
  wrapper.setAttribute('aria-label', draw ? 'Hovedtall ' + draw.main.join(', ') + '. Tilleggstall ' + draw.bonus + '.' : 'Ingen tall trukket.');
  byId('draw-status').textContent = draw ? 'Gevinst denne uken: ' + money(draw.payout) : 'Start simuleringen for å trekke vinnertallene.';
  byId('browse').hidden = !draw;
  byId('prev').disabled = selectedWeek <= 0;
  byId('next').disabled = selectedWeek + 1 >= count;
  drawInput.min = '1';
  drawInput.max = String(Math.max(count, 1));
  drawInput.value = String(selectedWeek + 1);
  renderTicket(draw);
}

function renderSummary() {
  byId('result-caption').textContent = result ? 'Samlet for ' + weeksLabel(result.draws.length) : 'Ingen simulering ennå';
  byId('cost').textContent = money(result?.totalCost ?? 0);
  byId('prize').textContent = money(result?.totalPrize ?? 0);
  const net = (result?.totalPrize ?? 0) - (result?.totalCost ?? 0);
  const netNode = byId('net');
  netNode.textContent = (net > 0 ? '+' : '') + money(net);
  netNode.classList.toggle('positive', net > 0);
  netNode.classList.toggle('negative', net < 0);
  byId('wins-wrap').hidden = !result;
  byId('wins').replaceChildren(...(result ? TIERS.map((tier, index) => {
    const row = element('li');
    const count = result.counts[index];
    row.append(element('span', tier.label), element('strong', format.format(count) + (count === 1 ? ' rekke' : ' rekker')));
    return row;
  }) : []));
}

byId('presets').addEventListener('click', event => {
  const button = event.target.closest('[data-weeks]');
  if (!button) return;
  weeksInput.value = button.dataset.weeks;
  renderPlan();
});
weeksInput.addEventListener('input', () => renderPlan());
setupForm.noValidate = true;
setupForm.addEventListener('submit', event => {
  event.preventDefault();
  const weeks = chosenWeeks();
  if (!weeks) {
    renderPlan(true);
    weeksInput.focus();
    return;
  }
  result = simulate(ticket, weeks);
  selectedWeek = weeks - 1;
  renderPlan();
  renderDraw();
  renderSummary();
  byId('summary-status').textContent = weeksLabel(weeks) + ' simulert. Innsats ' + money(result.totalCost) +
    '. Gevinst ' + money(result.totalPrize) + '. Nettoresultat ' + money(result.totalPrize - result.totalCost) + '.';
});

function goToWeek(index) {
  if (!result) return;
  selectedWeek = Math.max(0, Math.min(result.draws.length - 1, index));
  renderDraw();
}

byId('prev').addEventListener('click', () => goToWeek(selectedWeek - 1));
byId('next').addEventListener('click', () => goToWeek(selectedWeek + 1));
function jumpToInput() {
  const week = drawInput.valueAsNumber;
  goToWeek(Number.isInteger(week) ? week - 1 : selectedWeek);
}
drawInput.addEventListener('change', jumpToInput);
drawInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    jumpToInput();
  }
});

for (const group of [...TIERS, { label: 'Supertrekning', share: 7.35, prize: null }]) {
  const row = element('tr');
  const label = element('th', group.label);
  label.scope = 'row';
  row.append(label, element('td', format.format(group.share) + ' %'), element('td', group.prize === null ? 'Utenfor simuleringen' : money(group.prize)));
  byId('prize-table').append(row);
}

const editRow = byId('edit-row');
const grid = byId('edit-grid');
for (let i = 0; i < ticket.length; i++) {
  const option = element('option', 'Rekke ' + (i + 1));
  option.value = String(i);
  editRow.append(option);
}

for (let i = 1; i <= 34; i++) {
  const button = element('button', twoDigits(i), 'number-choice');
  button.type = 'button';
  button.dataset.number = String(i);
  grid.append(button);
}

function renderDraft() {
  for (const button of grid.querySelectorAll('[data-number]')) {
    const selected = draft.has(Number(button.dataset.number));
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('selected', selected);
  }
  byId('edit-count').textContent = draft.size + ' av 7 valgt';
  byId('edit-error').textContent = '';
  byId('edit-save').disabled = draft.size !== 7;
}

function loadDraft() {
  draft = new Set(ticket[Number(editRow.value)]);
  renderDraft();
}

editRow.addEventListener('change', loadDraft);
grid.addEventListener('click', event => {
  const button = event.target.closest('[data-number]');
  if (!button) return;
  const number = Number(button.dataset.number);
  if (draft.has(number)) draft.delete(number);
  else if (draft.size < 7) draft.add(number);
  else {
    byId('edit-error').textContent = 'Ta bort ett tall før du velger et nytt.';
    return;
  }
  renderDraft();
});
byId('edit-random').addEventListener('click', () => {
  draft = new Set(drawWeek().main);
  renderDraft();
});
byId('edit-save').addEventListener('click', () => {
  if (draft.size !== 7) return;
  const index = Number(editRow.value);
  const row = [...draft].sort((a, b) => a - b);
  const key = row.join(',');
  if (ticket.some((other, i) => i !== index && other.join(',') === key)) {
    byId('edit-error').textContent = 'En annen rekke har de samme sju tallene. Bytt ut minst ett tall.';
    return;
  }
  if (ticket[index].join(',') !== key) {
    ticket[index] = row;
    saveTicket(ticket);
    result = null;
    selectedWeek = 0;
    renderDraw();
    renderSummary();
    byId('summary-status').textContent = 'Rekke ' + (index + 1) + ' er endret. Kupongen er klar for en ny simulering.';
  }
  byId('edit').close();
});

document.querySelectorAll('[data-modal]').forEach(button => button.addEventListener('click', () => {
  const dialog = byId(button.dataset.modal);
  if (dialog.id === 'edit') loadDraft();
  dialog.showModal();
}));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
renderPlan();
renderDraw();
renderSummary();
