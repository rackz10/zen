/* ============================================================
   Zen — Lógica de la aplicación
   Tareas · Finanzas (quincenas) · Notas
   Los datos se guardan en el navegador (localStorage).
   ============================================================ */
'use strict';

/* ---------------- Utilidades ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const round2 = (n) => Math.round(n * 100) / 100;

const store = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem('zen:' + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem('zen:' + key, JSON.stringify(value));
    } catch (e) {
      /* modo privado: la app sigue funcionando sin guardar */
    }
  },
};

/* Dinero: siempre con "$" y dos decimales */
const money = (n) =>
  (n < 0 ? '−' : '') +
  '$' +
  Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* Fechas */
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const dayMonth = (d) =>
  new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(d).replace(/\./g, '');
const shortMonth = (d) =>
  new Intl.DateTimeFormat('es', { month: 'short' }).format(d).replace(/\./g, '');

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/* ---------------- Categorías ---------------- */
const EXPENSE_CATS = [
  { e: '🍔', n: 'Alimentación' },
  { e: '🚗', n: 'Transporte' },
  { e: '🏠', n: 'Vivienda' },
  { e: '💡', n: 'Servicios' },
  { e: '🛍️', n: 'Compras' },
  { e: '🎬', n: 'Entretenimiento' },
  { e: '💊', n: 'Salud' },
  { e: '📚', n: 'Educación' },
  { e: '📱', n: 'Tecnología' },
  { e: '📦', n: 'Otros' },
];
const INCOME_CATS = [
  { e: '💼', n: 'Sueldo' },
  { e: '⚡', n: 'Freelance' },
  { e: '🎁', n: 'Regalo' },
  { e: '📈', n: 'Inversiones' },
  { e: '📦', n: 'Otros' },
];

/* ---------------- Datos ---------------- */
let tasks = store.read('tasks', []);
let txs = store.read('txs', []);
let notes = store.read('notes', []);

/* Nota de bienvenida la primera vez que se abre la app */
if (!store.read('seeded', false)) {
  notes.push({
    id: uid(),
    title: '👋 Bienvenido a Zen',
    body:
      'Zen reúne tus tareas, tus finanzas y tus notas en un solo lugar.\n\n' +
      '📲 Para usarla en tu iPhone: ábrela en Safari, toca el botón de Compartir y elige «Agregar a pantalla de inicio».\n\n' +
      '💡 Consejo: en Finanzas registra tu sueldo del mes como ingreso y así verás al instante con cuánto cuentas cada quincena.\n\n' +
      'Todo se guarda en este dispositivo. Puedes borrar esta nota cuando quieras.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  store.write('seeded', true);
  store.write('notes', notes);
}

const state = {
  view: 'tasks',
  taskFilter: 'all',
  fq: toISO(startOfQuincena(new Date())), // quincena seleccionada en Finanzas
  editingNote: null,
};

/* ---------------- Tema (claro / oscuro) ---------------- */
const themeMeta = document.querySelector('meta[name="theme-color"]');
const storedTheme = (() => {
  try {
    return localStorage.getItem('zen:theme');
  } catch (e) {
    return null;
  }
})();

const theme = {
  value: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  apply(v) {
    this.value = v;
    document.documentElement.dataset.theme = v;
    try {
      localStorage.setItem('zen:theme', v);
    } catch (e) {}
    if (themeMeta) themeMeta.setAttribute('content', v === 'dark' ? '#0a0a10' : '#efeff4');
  },
};

/* Si el usuario nunca eligió tema, seguimos al sistema */
if (storedTheme !== 'light' && storedTheme !== 'dark') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onSysChange = (e) => theme.apply(e.matches ? 'dark' : 'light');
  if (mq.addEventListener) mq.addEventListener('change', onSysChange);
  else if (mq.addListener) mq.addListener(onSysChange);
}

/* ---------------- Quincenas ---------------- */
function startOfQuincena(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() <= 15 ? 1 : 16);
}
function endOfQuincena(start) {
  return start.getDate() === 1
    ? new Date(start.getFullYear(), start.getMonth(), 15)
    : new Date(start.getFullYear(), start.getMonth() + 1, 0);
}
function shiftQuincena(start, delta) {
  const base = new Date(delta > 0 ? endOfQuincena(start) : start);
  base.setDate(base.getDate() + (delta > 0 ? 1 : -1));
  return startOfQuincena(base);
}
const isCurrentQuincena = (iso) => iso === toISO(startOfQuincena(new Date()));

/* ---------------- Navegación entre secciones ---------------- */
function setView(name) {
  state.view = name;
  $$('.view').forEach((v) => v.classList.toggle('is-active', v.dataset.view === name));
  $$('.tab').forEach((t) => {
    const on = t.dataset.view === name;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
  });
  store.write('view', name);

  const labels = { tasks: 'Añadir tarea', finance: 'Añadir movimiento', notes: 'Crear nota' };
  $('#fab').setAttribute('aria-label', labels[name] || 'Añadir');
}

/* ---------------- Indicador del control segmentado ---------------- */
function moveIndicator(el, index, count) {
  const ind = el.querySelector('.seg-indicator');
  if (!ind) return;
  el.style.setProperty('--seg-count', count);
  ind.style.transform = `translateX(${index * 100}%)`;
}

/* ============================================================
   TAREAS
   ============================================================ */
let renderedTaskIds = [];

function taskRowHTML(t, isNew) {
  return `
    <li class="row${isNew ? ' is-new' : ''}" data-id="${t.id}">
      <button class="check${t.done ? ' is-done' : ''}" type="button" data-act="toggle"
              aria-pressed="${t.done}"
              aria-label="${t.done ? 'Marcar como pendiente' : 'Marcar como completada'}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
      </button>
      <span class="row-text${t.done ? ' is-done' : ''}">${esc(t.text)}</span>
      <button class="row-delete" type="button" data-act="delete" aria-label="Eliminar tarea">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3V6.5M6.5 6.5l.9 12.2a1.8 1.8 0 0 0 1.8 1.7h5.6a1.8 1.8 0 0 0 1.8-1.7l.9-12.2"/>
        </svg>
      </button>
    </li>`;
}

function renderTasks() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  $('#tasks-total').textContent = total;
  $('#tasks-done').textContent = done;
  $('#tasks-percent').textContent = pct + '%';
  $('#tasks-bar').style.width = pct + '%';

  const filtered = tasks.filter((t) =>
    state.taskFilter === 'all' ? true : state.taskFilter === 'done' ? t.done : !t.done
  );

  const prevIds = renderedTaskIds;
  $('#tasks-list').innerHTML = filtered
    .map((t) => taskRowHTML(t, !prevIds.includes(t.id)))
    .join('');
  renderedTaskIds = filtered.map((t) => t.id);

  const empty = $('#tasks-empty');
  empty.hidden = filtered.length > 0;
  if (filtered.length === 0) {
    const title = empty.querySelector('.empty-title');
    const text = empty.querySelector('.empty-text');
    if (total === 0) {
      title.textContent = 'Todo en calma';
      text.innerHTML = 'No hay tareas todavía. Pulsa <strong>+</strong> para añadir la primera.';
    } else if (state.taskFilter === 'pending') {
      title.textContent = '¡Nada pendiente!';
      text.textContent = 'Has completado todas tus tareas. Respira tranquilo 🌿';
    } else {
      title.textContent = 'Aún sin completar';
      text.textContent = 'Toca el círculo de una tarea cuando la termines.';
    }
  }
}

function toggleTask(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  store.write('tasks', tasks);
  renderTasks();

  const total = tasks.length;
  const done = tasks.filter((x) => x.done).length;
  if (total > 0 && done === total) showToast('¡Todas las tareas completadas! 🎉');
}

function deleteTask(id) {
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const [item] = tasks.splice(idx, 1);
  store.write('tasks', tasks);
  renderTasks();
  showToast('Tarea eliminada', 'Deshacer', () => {
    tasks.splice(idx, 0, item);
    store.write('tasks', tasks);
    renderTasks();
  });
}

/* ============================================================
   FINANZAS
   ============================================================ */
function renderFinance() {
  const start = fromISO(state.fq);
  const end = endOfQuincena(start);
  const q = start.getDate() === 1 ? 1 : 2;
  const monthName = MONTHS[start.getMonth()];

  $('#quincena-kicker').textContent = isCurrentQuincena(state.fq) ? 'Quincena actual' : 'Historial · toca para volver';
  $('#quincena-title').textContent = `Quincena ${q} · ${cap(monthName)}`;
  $('#quincena-range').textContent = `${start.getDate()} – ${end.getDate()} ${shortMonth(end)}`;

  const startISO = toISO(start);
  const endISO = toISO(end);
  const list = txs
    .filter((t) => t.date >= startISO && t.date <= endISO)
    .sort((a, b) => (a.date === b.date ? (b.createdAt || 0) - (a.createdAt || 0) : b.date.localeCompare(a.date)));

  const income = round2(list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0));
  const expense = round2(list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  const balance = round2(income - expense);

  $('#f-income').textContent = money(income);
  $('#f-expense').textContent = money(expense);
  const balEl = $('#f-balance');
  balEl.textContent = money(balance);
  balEl.classList.toggle('is-negative', balance < 0);

  /* Pista: cuánto queda y cuánto se puede gastar al día */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toISO(today);
  let hint;
  if (income === 0 && expense === 0) {
    hint = 'Registra ingresos y gastos para ver tu disponibilidad.';
  } else if (todayISO > endISO) {
    hint = `Quincena cerrada con ${list.length} movimiento${list.length === 1 ? '' : 's'}.`;
  } else if (todayISO < startISO) {
    hint = `Aún no comienza: faltan ${Math.round((start - today) / 86400000)} días.`;
  } else {
    const daysLeft = Math.round((end - today) / 86400000) + 1;
    if (balance <= 0) {
      hint = 'Ojo: los gastos han superado tus ingresos en esta quincena.';
    } else if (daysLeft > 0) {
      hint = `Te quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'} · puedes gastar ≈ ${money(
        round2(balance / daysLeft)
      )} al día.`;
    } else {
      hint = 'Último día de la quincena 🌙';
    }
  }
  $('#f-hint').textContent = hint;

  /* Lista de movimientos */
  const prevIds = (renderFinance.prevIds || []).slice();
  $('#tx-list').innerHTML = list.map((t) => txRowHTML(t, !prevIds.includes(t.id))).join('');
  renderFinance.prevIds = list.map((t) => t.id);
  $('#tx-empty').hidden = list.length > 0;
}

function txRowHTML(t, isNew) {
  const sign = t.type === 'income' ? '+' : '−';
  return `
    <li class="row${isNew ? ' is-new' : ''}" data-id="${t.id}">
      <span class="tx-emoji" aria-hidden="true">${t.emoji || '📦'}</span>
      <span class="tx-main">
        <span class="tx-name">${esc(t.cat)}</span>
        <span class="tx-sub">${t.note ? esc(t.note) : t.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
      </span>
      <span class="tx-right">
        <span class="tx-amount ${t.type === 'income' ? 'positive' : 'negative'}">${sign}${money(t.amount)}</span>
        <span class="tx-date">${dayMonth(fromISO(t.date))}</span>
      </span>
      <button class="row-delete" type="button" data-act="delete" aria-label="Eliminar movimiento">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3V6.5M6.5 6.5l.9 12.2a1.8 1.8 0 0 0 1.8 1.7h5.6a1.8 1.8 0 0 0 1.8-1.7l.9-12.2"/>
        </svg>
      </button>
    </li>`;
}

function deleteTx(id) {
  const idx = txs.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const [item] = txs.splice(idx, 1);
  store.write('txs', txs);
  renderFinance();
  showToast('Movimiento eliminado', 'Deshacer', () => {
    txs.splice(idx, 0, item);
    store.write('txs', txs);
    renderFinance();
  });
}

/* ============================================================
   NOTAS
   ============================================================ */
let renderedNoteIds = [];

function noteCardHTML(n, isNew) {
  const title = n.title.trim() || 'Sin título';
  const body = n.body.trim();
  return `
    <button class="note-card${isNew ? ' is-new' : ''}" type="button" data-id="${n.id}">
      <span class="note-title">${esc(title)}</span>
      <span class="note-preview${body ? '' : ' is-empty'}">${
        body ? esc(body).replace(/\n+/g, ' ') : 'Nota vacía…'
      }</span>
      <span class="note-date">${dayMonth(new Date(n.updatedAt))}</span>
    </button>`;
}

function renderNotes() {
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  const prevIds = renderedNoteIds;
  $('#notes-grid').innerHTML = sorted
    .map((n) => noteCardHTML(n, !prevIds.includes(n.id)))
    .join('');
  renderedNoteIds = sorted.map((n) => n.id);
  $('#notes-empty').hidden = notes.length > 0;
}

function createNote() {
  const note = { id: uid(), title: '', body: '', createdAt: Date.now(), updatedAt: Date.now() };
  notes.push(note);
  store.write('notes', notes);
  renderNotes();
  openEditor(note.id);
}

function deleteNote(id) {
  const idx = notes.findIndex((n) => n.id === id);
  if (idx < 0) return;
  const [item] = notes.splice(idx, 1);
  store.write('notes', notes);
  if (state.editingNote === id) closeEditorNow();
  renderNotes();
  showToast('Nota eliminada', 'Deshacer', () => {
    notes.splice(idx, 0, item);
    store.write('notes', notes);
    renderNotes();
  });
}

/* ---------------- Editor ---------------- */
const editor = $('#editor');
const editorTitle = $('#editor-title');
const editorBody = $('#editor-body');
let saveTimer = null;
let statusTimer = null;

function openEditor(id) {
  const n = notes.find((x) => x.id === id);
  if (!n) return;
  state.editingNote = id;
  editorTitle.value = n.title;
  editorBody.value = n.body;
  updateEditorMeta(n);
  editor.hidden = false;
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => editor.classList.add('is-open'));
  setTimeout(() => {
    (n.title || n.body ? editorBody : editorTitle).focus({ preventScroll: true });
  }, 450);
}

function updateEditorMeta(n) {
  $('#editor-meta').textContent = `Creada el ${dayMonth(new Date(n.createdAt))} · Editada ${dayMonth(
    new Date(n.updatedAt)
  )}`;
}

function flashStatus(text) {
  const el = $('#editor-status');
  el.textContent = text;
  el.classList.add('is-visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => el.classList.remove('is-visible'), 1600);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNote, 450);
}

function saveNote() {
  const n = notes.find((x) => x.id === state.editingNote);
  if (!n) return;
  n.title = editorTitle.value;
  n.body = editorBody.value;
  n.updatedAt = Date.now();
  store.write('notes', notes);
  updateEditorMeta(n);
  flashStatus('Guardado ✓');
}

function closeEditorNow() {
  clearTimeout(saveTimer);
  state.editingNote = null;
  editor.classList.remove('is-open');
  document.body.classList.remove('no-scroll');
  setTimeout(() => {
    editor.hidden = true;
  }, 430);
}

function closeEditor() {
  clearTimeout(saveTimer);
  saveNote();
  const n = notes.find((x) => x.id === state.editingNote);
  /* Si quedó totalmente vacía, no la dejamos huérfana */
  if (n && !n.title.trim() && !n.body.trim()) {
    notes = notes.filter((x) => x.id !== n.id);
    store.write('notes', notes);
  }
  closeEditorNow();
  renderNotes();
}

/* ============================================================
   HOJA INFERIOR (formularios)
   ============================================================ */
const sheet = $('#sheet');
const backdrop = $('#backdrop');
const sheetBody = $('#sheet-body');
let sheetTimer = null;

function openSheet(title, html, onReady) {
  clearTimeout(sheetTimer);
  $('#sheet-title').textContent = title;
  sheetBody.innerHTML = html;
  sheet.hidden = false;
  backdrop.hidden = false;
  document.body.classList.add('no-scroll');
  $('#fab').classList.add('is-hidden');
  requestAnimationFrame(() => {
    sheet.classList.add('is-open');
    backdrop.classList.add('is-open');
  });
  if (onReady) onReady(sheetBody);
  const first = sheetBody.querySelector('input');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 430);
}

function closeSheet() {
  clearTimeout(sheetTimer);
  sheet.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  $('#fab').classList.remove('is-hidden');
  document.body.classList.remove('no-scroll');
  sheetTimer = setTimeout(() => {
    sheet.hidden = true;
    backdrop.hidden = true;
    sheetBody.innerHTML = '';
  }, 430);
}

function markInvalid(field) {
  field.classList.add('is-invalid');
  setTimeout(() => field.classList.remove('is-invalid'), 500);
  field.focus({ preventScroll: true });
}

/* ---------------- Hoja: nueva tarea ---------------- */
function openTaskSheet() {
  openSheet(
    'Nueva tarea',
    `
    <div class="form-group">
      <label class="field-label" for="task-input">Tarea</label>
      <input id="task-input" class="field" type="text" maxlength="140"
             placeholder="¿Qué necesitas hacer?" autocomplete="off" enterkeyhint="done" />
    </div>
    <button id="task-save" class="primary-btn" type="button">Agregar tarea</button>
    <p class="form-note">También puedes pulsar «Intro» para guardar.</p>
  `,
    (body) => {
      const input = body.querySelector('#task-input');
      const save = () => {
        const text = input.value.trim();
        if (!text) return markInvalid(input);
        tasks.unshift({ id: uid(), text, done: false, createdAt: Date.now() });
        store.write('tasks', tasks);
        renderTasks();
        closeSheet();
      };
      body.querySelector('#task-save').addEventListener('click', save);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
      });
    }
  );
}

/* ---------------- Hoja: nuevo movimiento ---------------- */
function parseAmount(v) {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isFinite(n) ? round2(n) : NaN;
}

function openTxSheet() {
  openSheet(
    'Nuevo movimiento',
    `
    <div class="segmented" id="tx-type">
      <span class="seg-indicator" aria-hidden="true"></span>
      <button class="seg-btn is-active" type="button" data-type="expense">Gasto</button>
      <button class="seg-btn" type="button" data-type="income">Ingreso</button>
    </div>
    <div class="form-group">
      <label class="field-label" for="tx-amount">Cantidad</label>
      <input id="tx-amount" class="field amount-input" inputmode="decimal"
             placeholder="$0.00" autocomplete="off" enterkeyhint="done" />
    </div>
    <div class="form-group">
      <span class="field-label">Categoría</span>
      <div class="chips" id="tx-cats"></div>
    </div>
    <div class="form-group">
      <label class="field-label" for="tx-note">Nota (opcional)</label>
      <input id="tx-note" class="field" type="text" maxlength="60"
             placeholder="Ej. Compra semanal" autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="field-label" for="tx-date">Fecha</label>
      <input id="tx-date" class="field" type="date" value="${toISO(new Date())}" />
    </div>
    <button id="tx-save" class="primary-btn" type="button">Guardar movimiento</button>
  `,
    (body) => {
      const seg = body.querySelector('#tx-type');
      const chips = body.querySelector('#tx-cats');
      const amount = body.querySelector('#tx-amount');
      const note = body.querySelector('#tx-note');
      const date = body.querySelector('#tx-date');
      let type = 'expense';
      let catIdx = 0;

      const cats = () => (type === 'income' ? INCOME_CATS : EXPENSE_CATS);
      const renderChips = () => {
        chips.innerHTML = cats()
          .map(
            (c, i) =>
              `<button class="chip${i === catIdx ? ' is-active' : ''}" type="button" data-idx="${i}">${c.e} ${c.n}</button>`
          )
          .join('');
      };
      renderChips();
      moveIndicator(seg, 0, 2);

      seg.addEventListener('click', (e) => {
        const b = e.target.closest('.seg-btn');
        if (!b) return;
        const btns = $$('.seg-btn', seg);
        type = b.dataset.type;
        catIdx = 0;
        btns.forEach((x) => x.classList.toggle('is-active', x === b));
        moveIndicator(seg, btns.indexOf(b), btns.length);
        renderChips();
      });

      chips.addEventListener('click', (e) => {
        const c = e.target.closest('.chip');
        if (!c) return;
        catIdx = Number(c.dataset.idx);
        $$('.chip', chips).forEach((x) => x.classList.toggle('is-active', x === c));
      });

      body.querySelector('#tx-save').addEventListener('click', () => {
        const value = parseAmount(amount.value);
        if (!value || value <= 0) return markInvalid(amount);
        const cat = cats()[catIdx];
        const dateVal = date.value || toISO(new Date());
        txs.push({
          id: uid(),
          type,
          amount: value,
          emoji: cat.e,
          cat: cat.n,
          note: note.value.trim(),
          date: dateVal,
          createdAt: Date.now(),
        });
        store.write('txs', txs);
        /* Si la fecha elegida está en otra quincena, viajamos a ella */
        state.fq = toISO(startOfQuincena(fromISO(dateVal)));
        renderFinance();
        closeSheet();
      });
    }
  );
}

/* ============================================================
   AVISO FLOTANTE (deshacer)
   ============================================================ */
let toastTimer = null;
let toastCb = null;

function showToast(text, actionLabel, cb) {
  const t = $('#toast');
  const action = $('#toast-action');
  $('#toast-text').textContent = text;
  toastCb = cb || null;
  action.hidden = !actionLabel;
  if (actionLabel) action.textContent = actionLabel;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add('is-visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, actionLabel ? 4500 : 2400);
}

function hideToast() {
  clearTimeout(toastTimer);
  const t = $('#toast');
  t.classList.remove('is-visible');
  toastCb = null;
  setTimeout(() => {
    t.hidden = true;
  }, 380);
}

/* ============================================================
   EVENTOS
   ============================================================ */
function bindEvents() {
  /* Tema */
  $('#theme-btn').addEventListener('click', () => {
    theme.apply(theme.value === 'dark' ? 'light' : 'dark');
  });

  /* Pestañas */
  $('.tab-bar').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) setView(tab.dataset.view);
  });

  /* Botón flotante */
  $('#fab').addEventListener('click', () => {
    if (state.view === 'tasks') openTaskSheet();
    else if (state.view === 'finance') openTxSheet();
    else createNote();
  });

  /* Filtro de tareas */
  $('#tasks-filter').addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    const btns = $$('#tasks-filter .seg-btn');
    btns.forEach((x) => x.classList.toggle('is-active', x === b));
    state.taskFilter = b.dataset.filter;
    moveIndicator($('#tasks-filter'), btns.indexOf(b), btns.length);
    renderTasks();
  });

  /* Lista de tareas */
  $('#tasks-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('.row').dataset.id;
    if (btn.dataset.act === 'toggle') toggleTask(id);
    else deleteTask(id);
  });

  /* Quincenas */
  $('#quincena-prev').addEventListener('click', () => {
    state.fq = toISO(shiftQuincena(fromISO(state.fq), -1));
    renderFinance();
  });
  $('#quincena-next').addEventListener('click', () => {
    state.fq = toISO(shiftQuincena(fromISO(state.fq), 1));
    renderFinance();
  });
  $('#quincena-title').parentElement.addEventListener('click', () => {
    const current = toISO(startOfQuincena(new Date()));
    if (state.fq !== current) {
      state.fq = current;
      renderFinance();
    }
  });

  /* Lista de movimientos */
  $('#tx-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act="delete"]');
    if (!btn) return;
    deleteTx(btn.closest('.row').dataset.id);
  });

  /* Notas */
  $('#notes-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.note-card');
    if (card) openEditor(card.dataset.id);
  });

  /* Hoja inferior */
  $('#sheet-cancel').addEventListener('click', closeSheet);
  backdrop.addEventListener('click', closeSheet);

  /* Editor */
  $('#editor-back').addEventListener('click', closeEditor);
  $('#editor-delete').addEventListener('click', () => {
    if (state.editingNote) deleteNote(state.editingNote);
  });
  editorTitle.addEventListener('input', scheduleSave);
  editorBody.addEventListener('input', scheduleSave);

  /* Aviso flotante (deshacer) */
  $('#toast-action').addEventListener('click', () => {
    const cb = toastCb;
    hideToast();
    if (cb) cb();
  });

  /* Aviso de instalación */
  $('#install-hint-close').addEventListener('click', () => {
    store.write('hintDismissed', true);
    const hint = $('#install-hint');
    hint.classList.remove('is-visible');
    setTimeout(() => {
      hint.hidden = true;
    }, 420);
  });

  /* Teclado */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!editor.hidden) closeEditor();
    else if (!sheet.hidden) closeSheet();
  });
}

/* ---------------- Aviso: agregar a pantalla de inicio (iOS) ---------------- */
function maybeShowInstallHint() {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  if (!isIOS || standalone || store.read('hintDismissed', false)) return;
  const hint = $('#install-hint');
  setTimeout(() => {
    hint.hidden = false;
    requestAnimationFrame(() => hint.classList.add('is-visible'));
  }, 1500);
}

/* ---------------- Función sin conexión (service worker) ---------------- */
function registerSW() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

/* ============================================================
   INICIO
   ============================================================ */
function init() {
  theme.apply(theme.value);

  $('#today-label').textContent = cap(
    new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(
      new Date()
    )
  );

  const lastView = store.read('view', 'tasks');
  setView(['tasks', 'finance', 'notes'].includes(lastView) ? lastView : 'tasks');

  moveIndicator($('#tasks-filter'), 0, 3);
  renderTasks();
  renderFinance();
  renderNotes();

  bindEvents();
  maybeShowInstallHint();
  registerSW();
}

init();
