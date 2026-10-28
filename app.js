const DAYS = [
  { key: 'monday', label: 'Senin', short: 'Sen', offset: 0 },
  { key: 'tuesday', label: 'Selasa', short: 'Sel', offset: 1 },
  { key: 'wednesday', label: 'Rabu', short: 'Rab', offset: 2 },
  { key: 'thursday', label: 'Kamis', short: 'Kam', offset: 3 },
  { key: 'friday', label: 'Jumat', short: 'Jum', offset: 4 }
];
const STORAGE_KEY = 'piketin-class-schedule-v1';
const DEFAULT_STATE = {
  className: 'Kelas 8A',
  fine: 10000,
  schedule: {
    monday: ['Alya', 'Bima', 'Citra', 'Dimas'],
    tuesday: ['Eka', 'Farhan', 'Gita', 'Hana'],
    wednesday: ['Indra', 'Jihan', 'Kezia', 'Lutfi'],
    thursday: ['Maya', 'Nanda', 'Oki', 'Putri'],
    friday: ['Rafi', 'Salsa', 'Tio', 'Vina']
  },
  records: {}
};

const elements = {
  className: document.querySelector('#class-name'),
  classNameInput: document.querySelector('#class-name-input'),
  date: document.querySelector('#selected-date'),
  weekdayGrid: document.querySelector('#weekday-grid'),
  list: document.querySelector('#attendance-list'),
  empty: document.querySelector('#empty-state'),
  footer: document.querySelector('#attendance-footer'),
  attendanceTitle: document.querySelector('#attendance-title'),
  attendanceDate: document.querySelector('#attendance-date'),
  statTotal: document.querySelector('#stat-total'),
  statPresent: document.querySelector('#stat-present'),
  statAbsent: document.querySelector('#stat-absent'),
  statFine: document.querySelector('#stat-fine'),
  presentCaption: document.querySelector('#present-caption'),
  fineCaption: document.querySelector('#fine-caption'),
  history: document.querySelector('#history-list'),
  historyEmpty: document.querySelector('#history-empty'),
  fineNote: document.querySelector('#fine-note-amount'),
  themeToggle: document.querySelector('#theme-toggle'),
  themeColor: document.querySelector('meta[name="theme-color"]'),
  dialog: document.querySelector('#settings-dialog'),
  form: document.querySelector('#settings-form'),
  fineInput: document.querySelector('#fine-input'),
  scheduleFields: document.querySelector('#schedule-fields'),
  toast: document.querySelector('#toast')
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(saved);
    return {
      className: typeof parsed.className === 'string' && parsed.className.trim()
        ? parsed.className.trim().slice(0, 40)
        : DEFAULT_STATE.className,
      fine: Number.isFinite(Number(parsed.fine)) && Number(parsed.fine) >= 0 ? Number(parsed.fine) : DEFAULT_STATE.fine,
      schedule: Object.fromEntries(DAYS.map(day => [
        day.key,
        Array.isArray(parsed.schedule?.[day.key]) ? parsed.schedule[day.key].filter(name => typeof name === 'string') : [...DEFAULT_STATE.schedule[day.key]]
      ])),
      records: parsed.records && typeof parsed.records === 'object' && !Array.isArray(parsed.records) ? parsed.records : {}
    };
  } catch (error) {
    console.error('Gagal membaca data jadwal piket dari penyimpanan lokal.', error);
    showToast('Data lokal tidak dapat dibaca. Jadwal contoh ditampilkan.', true);
    return structuredClone(DEFAULT_STATE);
  }
}

let state = loadState();
let toastTimer;

function updateThemeButton() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const action = isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap';
  elements.themeToggle.textContent = isDark ? '☀' : '☾';
  elements.themeToggle.setAttribute('aria-label', action);
  elements.themeToggle.setAttribute('title', action);
  elements.themeToggle.setAttribute('aria-pressed', String(isDark));
  elements.themeColor.content = isDark ? '#111827' : '#f5f7fb';
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  updateThemeButton();
  try {
    localStorage.setItem('piketin-theme', nextTheme);
  } catch (error) {
    console.error('Gagal menyimpan preferensi tema.', error);
    showToast('Tema berubah, tetapi tidak dapat disimpan di browser ini.', true);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('Gagal menyimpan data jadwal piket ke penyimpanan lokal.', error);
    showToast('Perubahan tidak dapat disimpan di browser ini.', true);
    return false;
  }
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', isError);
  elements.toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('visible'), 2800);
}

function formatMoney(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Intl.DateTimeFormat('id-ID', options).format(date);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayInfo(date) {
  return DAYS[date.getDay() - 1] || null;
}

function getRecord(key) {
  const record = state.records[key];
  if (!record || typeof record !== 'object' || Array.isArray(record)) return {};
  return record;
}

function setDate(date) {
  elements.date.value = dateKey(date);
  render();
}

function getWeekMonday(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function renderSchedule(date) {
  const monday = getWeekMonday(date);
  elements.weekdayGrid.replaceChildren();
  DAYS.forEach(day => {
    const cardDate = new Date(monday);
    cardDate.setDate(monday.getDate() + day.offset);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `weekday-card${getDayInfo(date)?.key === day.key ? ' active' : ''}`;
    card.setAttribute('aria-label', `Pilih ${day.label}, ${state.schedule[day.key].length} petugas`);
    card.addEventListener('click', () => setDate(cardDate));

    const top = document.createElement('div');
    top.className = 'weekday-top';
    const name = document.createElement('span');
    name.className = 'weekday-name';
    name.textContent = day.label;
    const dayDate = document.createElement('span');
    dayDate.className = 'weekday-date';
    dayDate.textContent = formatDate(cardDate, { day: 'numeric', month: 'short' });
    top.append(name, dayDate);

    const names = document.createElement('div');
    names.className = 'weekday-names';
    const assigned = state.schedule[day.key];
    if (assigned.length) {
      assigned.slice(0, 3).forEach(student => {
        const chip = document.createElement('span');
        chip.className = 'name-chip';
        chip.textContent = student;
        names.append(chip);
      });
      if (assigned.length > 3) {
        const more = document.createElement('span');
        more.className = 'name-chip';
        more.textContent = `+${assigned.length - 3}`;
        names.append(more);
      }
    } else {
      const noNames = document.createElement('span');
      noNames.className = 'no-names';
      noNames.textContent = 'Belum ada petugas';
      names.append(noNames);
    }
    card.append(top, names);
    elements.weekdayGrid.append(card);
  });
}

function renderAttendance(date) {
  const info = getDayInfo(date);
  const students = info ? state.schedule[info.key] : [];
  const record = getRecord(dateKey(date));
  const present = students.filter(student => record[student] === 'present').length;
  const absent = students.filter(student => record[student] === 'absent').length;
  const fine = absent * state.fine;

  elements.attendanceTitle.textContent = info ? `Kehadiran ${info.label}` : 'Kehadiran akhir pekan';
  elements.attendanceDate.textContent = formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' });
  elements.statTotal.textContent = String(students.length);
  elements.statPresent.textContent = String(present);
  elements.statAbsent.textContent = String(absent);
  elements.statFine.textContent = formatMoney(fine);
  elements.presentCaption.textContent = `${present} dari ${students.length} orang hadir`;
  elements.fineCaption.textContent = `${absent} orang × ${formatMoney(state.fine)}`;
  elements.fineNote.textContent = formatMoney(state.fine);

  elements.list.replaceChildren();
  elements.empty.hidden = students.length > 0;
  elements.footer.hidden = students.length === 0;
  students.forEach(student => {
    const status = record[student];
    const row = document.createElement('div');
    row.className = 'attendance-row';
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = student.trim().charAt(0).toLocaleUpperCase('id-ID') || '?';
    const infoColumn = document.createElement('div');
    infoColumn.className = 'student-info';
    const name = document.createElement('div');
    name.className = 'student-name';
    name.textContent = student;
    const statusText = document.createElement('div');
    statusText.className = `student-status${status === 'present' ? ' present' : status === 'absent' ? ' absent' : ''}`;
    statusText.textContent = status === 'present' ? 'Sudah piket' : status === 'absent' ? `Tidak piket · denda ${formatMoney(state.fine)}` : 'Belum dicatat';
    infoColumn.append(name, statusText);

    const actions = document.createElement('div');
    actions.className = 'attendance-actions';
    [['present', 'Hadir'], ['absent', 'Tidak']].forEach(([value, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `status-button${status === value ? ` is-${value}` : ''}`;
      button.textContent = label;
      button.setAttribute('aria-pressed', String(status === value));
      button.setAttribute('aria-label', `Tandai ${student} ${value === 'present' ? 'hadir' : 'tidak hadir'}`);
      button.addEventListener('click', () => updateAttendance(date, student, value));
      actions.append(button);
    });
    row.append(avatar, infoColumn, actions);
    elements.list.append(row);
  });
}

function updateAttendance(date, student, status) {
  const key = dateKey(date);
  const info = getDayInfo(date);
  const previousRecord = getRecord(key);
  const record = {
    ...previousRecord,
    __students: Array.isArray(previousRecord.__students)
      ? previousRecord.__students
      : info ? [...state.schedule[info.key]] : [],
    [student]: status
  };
  state.records = { ...state.records, [key]: record };
  if (saveState()) {
    render();
    showToast(`${student} dicatat ${status === 'present' ? 'hadir' : 'tidak hadir'}.`);
  }
}

function renderHistory() {
  const entries = Object.entries(state.records)
    .filter(([key, record]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && record && typeof record === 'object')
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5);
  elements.history.replaceChildren();
  elements.historyEmpty.hidden = entries.length > 0;
  entries.forEach(([key, record]) => {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const info = getDayInfo(date);
    const scheduled = Array.isArray(record.__students)
      ? record.__students
      : info ? state.schedule[info.key] : [];
    const present = scheduled.filter(name => record[name] === 'present').length;
    const absent = scheduled.filter(name => record[name] === 'absent').length;
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'history-item';
    item.setAttribute('aria-label', `Lihat catatan ${formatDate(date)}`);
    item.addEventListener('click', () => setDate(date));
    const calendar = document.createElement('span');
    calendar.className = 'history-calendar';
    calendar.textContent = formatDate(date, { day: 'numeric', month: 'short' });
    const detail = document.createElement('span');
    detail.className = 'history-info';
    const dayName = document.createElement('span');
    dayName.className = 'history-day';
    dayName.textContent = info?.label || 'Akhir pekan';
    const summary = document.createElement('span');
    summary.className = 'history-detail';
    summary.textContent = `${present} hadir · ${absent} tidak hadir`;
    detail.append(dayName, summary);
    const amount = document.createElement('span');
    amount.className = 'history-amount';
    amount.textContent = absent ? formatMoney(absent * state.fine) : '—';
    item.append(calendar, detail, amount);
    elements.history.append(item);
  });
}

function render() {
  elements.className.textContent = state.className.toLocaleUpperCase('id-ID');
  const date = parseLocalDate(elements.date.value);
  renderSchedule(date);
  renderAttendance(date);
  renderHistory();
}

function openSettings() {
  elements.classNameInput.value = state.className;
  elements.fineInput.value = String(state.fine);
  elements.scheduleFields.replaceChildren();
  DAYS.forEach(day => {
    const wrapper = document.createElement('div');
    wrapper.className = 'day-field';
    const label = document.createElement('label');
    label.htmlFor = `schedule-${day.key}`;
    label.textContent = day.label;
    const textarea = document.createElement('textarea');
    textarea.id = `schedule-${day.key}`;
    textarea.name = day.key;
    textarea.value = state.schedule[day.key].join(', ');
    textarea.placeholder = 'Contoh: Alya, Bima';
    wrapper.append(label, textarea);
    elements.scheduleFields.append(wrapper);
  });
  elements.dialog.showModal();
}

function parseNames(value) {
  const seen = new Set();
  return value.split(/[,\n]/)
    .map(name => name.trim())
    .filter(name => {
      const normalized = name.toLocaleLowerCase('id-ID');
      if (!name || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

elements.date.value = dateKey(new Date());
elements.date.addEventListener('change', () => {
  if (!elements.date.value) return;
  render();
});
elements.themeToggle.addEventListener('click', toggleTheme);
document.querySelector('#open-settings').addEventListener('click', openSettings);
document.querySelector('#edit-schedule').addEventListener('click', openSettings);
document.querySelector('#close-settings').addEventListener('click', () => elements.dialog.close());
document.querySelector('#cancel-settings').addEventListener('click', () => elements.dialog.close());
elements.dialog.addEventListener('click', event => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.form.addEventListener('submit', event => {
  event.preventDefault();
  const className = elements.classNameInput.value.trim();
  if (!className) {
    showToast('Nama kelas tidak boleh kosong.', true);
    elements.classNameInput.focus();
    return;
  }
  const fine = Number(elements.fineInput.value);
  if (!Number.isFinite(fine) || fine < 0) {
    showToast('Masukkan nominal denda yang valid.', true);
    return;
  }
  const schedule = Object.fromEntries(DAYS.map(day => [
    day.key,
    parseNames(elements.form.elements[day.key].value)
  ]));
  state = { ...state, className, fine, schedule };
  if (saveState()) {
    elements.dialog.close();
    render();
    showToast('Jadwal dan nominal denda berhasil disimpan.');
  }
});

updateThemeButton();
render();
