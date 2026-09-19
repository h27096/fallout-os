'use strict';
const tasks = (() => {
    const key = 'robco.tasks.v1';
    let rows = [], snapshot = null, locked = false, editing = null;
    const panel = document.createElement('section');
    panel.id = 'tasksWindow'; panel.className = 'recordWindow'; panel.hidden = true;
    panel.setAttribute('aria-label', 'RobCo Tasks');
    panel.innerHTML = `<header class="fileTitle"><strong>ROBCO TASKS</strong><button id="tasksClose">CLOSE TASKS</button></header>
      <div style="padding:16px"><form id="taskForm"><label>TASK<input id="taskTitle" maxlength="200" required></label>
      <label>DUE DATE<input id="taskDue" type="date"></label><label>PRIORITY<select id="taskPriority"><option>Normal</option><option>High</option><option>Low</option></select></label>
      <button>SAVE TASK</button><button type="button" id="taskNew">NEW / CANCEL EDIT</button></form>
      <label>SHOW<select id="taskFilter"><option>All</option><option>Active</option><option>Completed</option></select></label>
      <ul id="taskList"></ul><p id="taskStatus" role="status"></p></div>`;
    document.body.append(panel);
    const get = id => document.getElementById(id);
    const status = text => { get('taskStatus').textContent = text; };
    const valid = row => row && typeof row.id === 'string' && typeof row.title === 'string' && row.title.trim() && row.title.length <= 200 && typeof row.done === 'boolean' && ['Normal', 'High', 'Low'].includes(row.priority) && typeof row.due === 'string' && (!row.due || /^\d{4}-\d{2}-\d{2}$/.test(row.due));
    try {
        snapshot = localStorage.getItem(key);
        if (snapshot !== null) {
            const saved = JSON.parse(snapshot);
            if (!Array.isArray(saved) || !saved.every(valid) || new Set(saved.map(r => r.id)).size !== saved.length) throw Error();
            rows = saved;
        }
    } catch { locked = true; status('Saved Tasks data unavailable or damaged. Preserved; reload after recovery.'); }
    function save(next) {
        if (locked) return false;
        try {
            if (localStorage.getItem(key) !== snapshot) throw Error('Tasks changed elsewhere. Reload before saving.');
            const text = JSON.stringify(next); localStorage.setItem(key, text); snapshot = text; rows = next;
            status('SAVED.'); render(); return true;
        } catch (error) { status('NOT SAVED. ' + error.message); return false; }
    }
    function reset() { editing = null; get('taskForm').reset(); }
    function render() {
        get('taskList').replaceChildren();
        const filter = get('taskFilter').value;
        for (const row of rows.filter(row => filter === 'All' || (filter === 'Completed') === row.done)) {
            const item = document.createElement('li');
            const label = document.createElement('span'); label.textContent = `${row.title} — ${row.priority}${row.due ? ' — ' + row.due : ''} `;
            const toggle = document.createElement('button'); toggle.textContent = row.done ? 'REOPEN' : 'COMPLETE';
            toggle.onclick = () => save(rows.map(r => r.id === row.id ? { ...r, done: !r.done } : r));
            const edit = document.createElement('button'); edit.textContent = 'EDIT';
            edit.onclick = () => { editing = row.id; get('taskTitle').value = row.title; get('taskDue').value = row.due; get('taskPriority').value = row.priority; get('taskTitle').focus(); };
            const remove = document.createElement('button'); remove.textContent = 'DELETE';
            remove.onclick = () => { if (confirm('Delete this task?') && save(rows.filter(r => r.id !== row.id)) && editing === row.id) reset(); };
            item.append(label, toggle, edit, remove); get('taskList').append(item);
        }
    }
    get('taskForm').onsubmit = event => {
        event.preventDefault();
        const title = get('taskTitle').value.trim(); if (!title) return;
        const row = { id: editing || crypto.randomUUID(), title, due: get('taskDue').value, priority: get('taskPriority').value, done: rows.find(r => r.id === editing)?.done || false };
        if (save(editing ? rows.map(r => r.id === editing ? row : r) : [...rows, row])) reset();
    };
    get('taskNew').onclick = reset;
    get('taskFilter').onchange = render;
    get('tasksClose').onclick = () => RobcoWindows.close(panel);
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') RobcoWindows.close(panel); });
    window.addEventListener('beforeunload', event => { if (get('taskTitle').value.trim()) { event.preventDefault(); event.returnValue = ''; } });
    RobcoWindows.register(panel);
    render();
    return { open() { RobcoWindows.show(panel); get('taskTitle').focus(); } };
})();
