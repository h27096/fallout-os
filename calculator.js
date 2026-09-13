'use strict';
const calculator = (() => {
    const get = id => document.getElementById(id);
    const panel = get('calculatorWindow'), input = get('calcExpression');
    const key = 'robco.calculator.v1';
    let state = { scientific: false, angle: 'deg', history: [] }, snapshot = null, warning = '';
    try {
        snapshot = localStorage.getItem(key);
        if (snapshot !== null) {
            const saved = JSON.parse(snapshot);
            if (!saved || typeof saved.scientific !== 'boolean' || !['deg', 'rad'].includes(saved.angle) || !Array.isArray(saved.history) || saved.history.length > 50 || saved.history.some(row => !row || typeof row.expression !== 'string' || row.expression.length > 512 || typeof row.result !== 'number' || !Number.isFinite(row.result) || !['deg', 'rad'].includes(row.angle))) throw Error('Invalid saved calculator data');
            state = saved;
        }
    } catch { warning = 'Saved calculator data unavailable or damaged; preserved. Using session memory.'; }
    function status(message) { get('calcStatus').textContent = message + (warning ? ' ' + warning : ''); }
    function save() {
        if (warning) return;
        try {
            if (localStorage.getItem(key) !== snapshot) throw Error('Calculator changed in another tab; reload to synchronize.');
            const value = JSON.stringify(state);
            localStorage.setItem(key, value); snapshot = value;
        } catch (error) { warning = 'Changes remain in this session only. ' + error.message; }
    }
    function settings() {
        get('calcScientific').hidden = !state.scientific;
        get('calcMode').setAttribute('aria-pressed', String(state.scientific));
        get('calcAngle').value = state.angle;
    }
    function history() {
        const list = get('calcHistory'); list.replaceChildren();
        get('calcEmpty').hidden = state.history.length > 0;
        get('calcClearHistory').disabled = !state.history.length;
        for (const row of state.history) {
            const item = document.createElement('li'), button = document.createElement('button');
            button.textContent = row.expression + ' = ' + RobcoMath.format(row.result) + ' [' + row.angle.toUpperCase() + ']';
            button.addEventListener('click', () => {
                input.value = row.expression; state.angle = row.angle; settings(); save();
                get('calcResult').textContent = RobcoMath.format(row.result); input.focus(); status('RECALLED. Edit and compute again.');
            });
            item.append(button); list.append(item);
        }
    }
    function insert(text) {
        if (input.value.length - (input.selectionEnd - input.selectionStart) + text.length > 512) { status('Expression too long.'); return; }
        input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end'); input.focus();
    }
    function compute() {
        try {
            const expression = input.value.trim(), result = RobcoMath.calculate(expression, state.angle);
            get('calcResult').textContent = RobcoMath.format(result);
            state.history.unshift({ expression, result, angle: state.angle }); state.history = state.history.slice(0, 50);
            save(); history(); status('COMPUTATION COMPLETE. Results displayed to 12 significant digits.');
        } catch (error) { get('calcResult').textContent = 'ERROR'; status(error.message); }
    }
    for (const [id, keys] of [['calcKeys', ['C', '⌫', '(', ')', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '%', '+']], ['calcScientific', ['sqrt(', '^', 'sin(', 'cos(', 'tan(', 'pi', 'ln(', 'log(']]]) {
        for (const text of keys) {
            const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
            if (text === 'C') button.setAttribute('aria-label', 'Clear expression');
            if (text === '⌫') button.setAttribute('aria-label', 'Backspace');
            button.addEventListener('click', () => {
                if (text === 'C') { input.value = ''; get('calcResult').textContent = '0'; input.focus(); status('READY.'); }
                else if (text === '⌫') { const end = input.selectionEnd, start = input.selectionStart; input.setRangeText('', start === end ? Math.max(0, start - 1) : start, end, 'end'); input.focus(); }
                else insert(text);
            });
            get(id).append(button);
        }
    }
    get('calcForm').addEventListener('submit', event => { event.preventDefault(); compute(); });
    input.addEventListener('keydown', event => { if (event.key === '=' && !event.isComposing) { event.preventDefault(); compute(); } });
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); RobcoWindows.close(panel); } });
    get('calcClose').addEventListener('click', () => RobcoWindows.close(panel));
    get('calcMode').addEventListener('click', () => { state.scientific = !state.scientific; settings(); save(); status('MODE UPDATED.'); });
    get('calcAngle').addEventListener('change', () => { state.angle = get('calcAngle').value; save(); status('ANGLE MODE UPDATED. Compute again to update the result.'); });
    get('calcClearHistory').addEventListener('click', () => { state.history = []; save(); history(); status('HISTORY CLEARED.'); });
    settings(); history(); RobcoWindows.register(panel);
    return { open() { RobcoWindows.show(panel); input.focus(); status('READY.'); } };
})();
