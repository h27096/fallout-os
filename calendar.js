'use strict';
const calendar = (() => {
    const key = 'robco.calendar.v1';
    const localDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    function dateTime(day, time) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return NaN;
        const [y, m, d] = day.split('-').map(Number), [h, min] = time.split(':').map(Number);
        const date = new Date(0); date.setFullYear(y, m - 1, d); date.setHours(h, min, 0, 0);
        return localDay(date) === day && date.getHours() === h && date.getMinutes() === min ? date.getTime() : NaN;
    }
    let rows = [], snapshot = null, locked = false, editing = null;
    let selected = localDay(new Date()), month = new Date(); month.setDate(1);
    const started = Date.now(), delivered = new Set();
    const panel = document.createElement('section');
    panel.id = 'calendarWindow'; panel.className = 'recordWindow'; panel.hidden = true;
    panel.setAttribute('aria-label', 'RobCo Clock & Calendar');
    panel.innerHTML = `<header class="fileTitle"><strong>ROBCO CLOCK & CALENDAR</strong><button id="calendarClose">CLOSE CALENDAR</button></header>
      <div class="calendarBody"><div class="calendarClock"><time id="calendarClock"></time><p id="calendarDate"></p></div>
      <p>Local time. Reminders run while Fallout OS is open; none are scheduled while it is closed.</p>
      <button id="calendarNotify">ENABLE NATIVE NOTIFICATIONS</button><p id="calendarNotificationStatus" role="status">In-app reminders are enabled.</p>
      <div id="calendarAlerts" role="alert"></div>
      <div class="calendarColumns"><div><nav class="fileToolbar" aria-label="Month navigation"><button id="calendarPrev" aria-label="Previous month">◀</button><h2 id="calendarMonth"></h2><button id="calendarNext" aria-label="Next month">▶</button><button id="calendarToday">TODAY</button></nav>
      <div id="calendarGrid" aria-label="Month calendar"></div><h3 id="calendarSelected"></h3><ul id="calendarDayEvents"></ul></div>
      <div><form id="calendarForm"><h2 id="calendarEditorHeading">NEW EVENT</h2><label>TITLE<input id="calendarTitle" maxlength="200" required></label>
      <label>DATE<input id="calendarEventDate" type="date" required min="0001-01-01" max="9999-12-31"></label><label>TIME<input id="calendarTime" type="time" required></label>
      <label>NOTES (OPTIONAL)<textarea id="calendarNotes" maxlength="4000"></textarea></label><button>SAVE EVENT</button><button type="button" id="calendarNew">NEW / CANCEL EDIT</button></form>
      <p id="calendarStatus" role="status"></p><h2>UPCOMING EVENTS</h2><ul id="calendarAgenda"></ul></div></div></div>`;
    document.body.append(panel);
    const get = id => document.getElementById(id);
    const status = text => { get('calendarStatus').textContent = text; };
    function valid(row) { return row && typeof row.id === 'string' && typeof row.title === 'string' && row.title.trim() && row.title.length <= 200 && typeof row.notes === 'string' && row.notes.length <= 4000 && Number.isFinite(dateTime(row.date, row.time)) && (row.notified === null || Number.isFinite(row.notified)); }
    try {
        snapshot = localStorage.getItem(key);
        if (snapshot !== null) {
            const saved = JSON.parse(snapshot);
            if (!Array.isArray(saved) || !saved.every(valid) || new Set(saved.map(r => r.id)).size !== saved.length) throw Error();
            rows = saved;
        }
    } catch { locked = true; status('Saved calendar unavailable or damaged. Data preserved; reload after recovery.'); }
    function save(next) {
        if (locked) return false;
        try {
            if (localStorage.getItem(key) !== snapshot) throw Error('Calendar changed elsewhere. Reload before saving.');
            const value = JSON.stringify(next); localStorage.setItem(key, value); snapshot = value; rows = next; return true;
        } catch (error) { status('NOT SAVED. ' + error.message); return false; }
    }
    function reset() { editing = null; get('calendarForm').reset(); get('calendarEventDate').value = selected; get('calendarEditorHeading').textContent = 'NEW EVENT'; }
    function list(target, events) {
        target.replaceChildren();
        if (!events.length) { const li = document.createElement('li'); li.textContent = 'No events.'; target.append(li); }
        for (const row of events) {
            const li = document.createElement('li'), text = document.createElement('p');
            text.textContent = `${row.date} ${row.time} — ${row.title}${row.notes ? '\n' + row.notes : ''}`;
            const edit = document.createElement('button'); edit.textContent = 'EDIT'; edit.setAttribute('aria-label', 'Edit ' + row.title);
            edit.onclick = () => { editing = row.id; get('calendarTitle').value = row.title; get('calendarEventDate').value = row.date; get('calendarTime').value = row.time; get('calendarNotes').value = row.notes; get('calendarEditorHeading').textContent = 'EDIT EVENT'; get('calendarTitle').focus(); };
            const remove = document.createElement('button'); remove.textContent = 'DELETE'; remove.setAttribute('aria-label', 'Delete ' + row.title);
            remove.onclick = () => { if (confirm('Delete this event?') && save(rows.filter(r => r.id !== row.id))) { if (editing === row.id) reset(); render(); status('Event deleted.'); get('calendarNew').focus(); } };
            li.append(text, edit, remove); target.append(li);
        }
    }
    function render() {
        get('calendarMonth').textContent = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        const grid = get('calendarGrid'); grid.replaceChildren();
        for (const day of ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']) { const label = document.createElement('span'); label.textContent = day; grid.append(label); }
        for (let i = 0; i < month.getDay(); i++) grid.append(document.createElement('span'));
        const end = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        for (let day = 1; day <= end; day++) {
            const date = new Date(month); date.setDate(day); const value = localDay(date), button = document.createElement('button');
            const count = rows.filter(r => r.date === value).length;
            button.textContent = day + (count ? ' •' : ''); button.dataset.date = value;
            button.setAttribute('aria-label', `${value}${count ? ', ' + count + ' events' : ''}`); button.setAttribute('aria-pressed', String(value === selected));
            if (value === localDay(new Date())) button.setAttribute('aria-current', 'date');
            button.onclick = () => { selected = value; if (!editing) get('calendarEventDate').value = value; render(); grid.querySelector(`[data-date="${value}"]`).focus(); };
            grid.append(button);
        }
        get('calendarSelected').textContent = 'EVENTS — ' + selected;
        const sorted = [...rows].sort((a, b) => dateTime(a.date, a.time) - dateTime(b.date, b.time));
        list(get('calendarDayEvents'), sorted.filter(r => r.date === selected));
        list(get('calendarAgenda'), sorted.filter(r => dateTime(r.date, r.time) >= Date.now()));
    }
    get('calendarForm').onsubmit = event => {
        event.preventDefault(); const title = get('calendarTitle').value.trim(), date = get('calendarEventDate').value, time = get('calendarTime').value;
        if (!title || !Number.isFinite(dateTime(date, time))) { status('Enter a valid local date and time. This time may not exist during a daylight-saving change.'); return; }
        const old = rows.find(r => r.id === editing);
        const row = { id: editing || crypto.randomUUID(), title, date, time, notes: get('calendarNotes').value, notified: old && old.date === date && old.time === time ? old.notified : null };
        if (save(editing ? rows.map(r => r.id === editing ? row : r) : [...rows, row])) { reset(); render(); status('Event saved.'); get('calendarTitle').focus(); }
    };
    get('calendarNew').onclick = () => { reset(); get('calendarTitle').focus(); };
    get('calendarPrev').onclick = () => { month.setMonth(month.getMonth() - 1); render(); };
    get('calendarNext').onclick = () => { month.setMonth(month.getMonth() + 1); render(); };
    get('calendarToday').onclick = () => { selected = localDay(new Date()); month = new Date(); month.setDate(1); render(); };
    get('calendarNotify').onclick = async () => {
        try { const permission = await Notification.requestPermission(); get('calendarNotificationStatus').textContent = permission === 'granted' ? 'Native notifications enabled; in-app reminders remain active.' : 'Native notifications unavailable or denied. In-app reminders remain active.'; }
        catch { get('calendarNotificationStatus').textContent = 'Native notifications unavailable. In-app reminders remain active.'; }
    };
    get('calendarClose').onclick = () => RobcoWindows.close(panel);
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); RobcoWindows.close(panel); } });
    let lastDay = '', lastMinute = '';
    function tick() {
        const now = new Date(); get('calendarClock').textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }); get('calendarClock').dateTime = now.toISOString();
        get('calendarDate').textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const minute = localDay(now) + now.getHours() + ':' + now.getMinutes();
        if ((lastDay !== localDay(now) || lastMinute !== minute) && !get('calendarGrid').contains(document.activeElement) && !get('calendarAgenda').contains(document.activeElement) && !get('calendarDayEvents').contains(document.activeElement)) { lastDay = localDay(now); lastMinute = minute; render(); }
        if (locked) return;
        for (const row of rows) {
            const due = dateTime(row.date, row.time), token = row.id + ':' + due;
            if (due < started || due > now.getTime() || row.notified === due || delivered.has(token)) continue;
            delivered.add(token);
            save(rows.map(r => r.id === row.id ? { ...r, notified: due } : r));
            const alert = document.createElement('div'), text = document.createElement('p'), dismiss = document.createElement('button');
            text.textContent = `REMINDER: ${row.title} — ${row.date} ${row.time}`; dismiss.textContent = 'DISMISS'; dismiss.onclick = () => { alert.remove(); get('calendarClose').focus(); };
            alert.append(text, dismiss); get('calendarAlerts').append(alert); RobcoWindows.show(panel);
            try { if (Notification.permission === 'granted') new Notification('RobCo reminder', { body: text.textContent }); } catch { /* Visible reminder above is always provided. */ }
        }
    }
    window.addEventListener('beforeunload', event => { if (get('calendarTitle').value.trim() || get('calendarNotes').value.trim()) { event.preventDefault(); event.returnValue = ''; } });
    RobcoWindows.register(panel); reset(); tick(); setInterval(tick, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    return { open() { render(); RobcoWindows.show(panel); get('calendarClose').focus(); } };
})();

