const display = document.getElementById('display');
const expression = document.getElementById('expression');
const statusDot = document.getElementById('statusDot');

let currentInput = '0';
let previousValue = null;
let pendingOperator = null;
let overwrite = true;

function formatNumber(n) {
    if (typeof n !== 'number') n = parseFloat(n);
    if (!isFinite(n)) return 'Error';
    const rounded = parseFloat(n.toFixed(10)); // Round to 10 decimal places
    return rounded.toString();
}

function updateScreen() {
    display.textContent = currentInput;
    expression.textContent = 
        previousValue !== null && pendingOperator 
            ? `${formatNumber(previousValue)} ${pendingOperator}` 
            : '\u00A0';
}

function setStatus(state) {
    statusDot.className = 'status-dot ' + (state ? ' ' + state : '');
}

function showError(msg) {
    display.textContent = msg;
    expression.textContent = '\u00A0';
    currentInput = '0';
    previousValue = null;
    pendingOperator = null;
    overwrite = true;
}

function clearAll() {
    currentInput = '0';
    previousValue = null;
    pendingOperator = null;
    overwrite = true;
    setStatus('');
    updateScreen();
}

function inputDigit(d) {
    if (overwrite) {
        currentInput = d;
        overwrite = false;
    } else {
        const digitCount = currentInput.replace('-', '').replace('.', '').length;
        if (digitCount >= 14) return;
        currentInput = currentInput === '0' ? d : currentInput + d;
    }
    updateScreen();
}

function inputDecimal() {
    if (overwrite) {
        currentInput = '0.';
        overwrite = false;
        updateScreen();
        return;
    }
    if (!currentInput.includes('.')) {
        currentInput += '.';
        updateScreen();
    }
}

function backspace() {
    if (overwrite) return;
    currentInput = currentInput.slice(0, -1);
    if (currentInput === '' || currentInput === '-') {
        currentInput = '0';
        overwrite = true;
    }
    updateScreen();
}

function percent() {
    const val = parseFloat(currentInput);
    if (isNaN(val)) return;
    currentInput = formatNumber(val / 100);
    updateScreen();
}

async function compute(a, b, op) {
    try {
        setStatus('pending');
        const res = await fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-type': 'application/json' },
            body: JSON.stringify({ a, b, op}),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
            showError(data.error || '通信エラー');
            setStatus('error');
            return null;
        }
        setStatus('ok');
        return data.result;
    } catch (err) {
        showError('サーバーに接続できません');
        setStatus('error');
        return null;
    }
}

async function setOperator(op) {
    const inputValue = parseFloat(currentInput);

    if (previousValue !== null && pendingOperator && !overwrite) {
        const result = await compute(previousValue, inputValue, pendingOperator);
        if (result === null) {
            updateScreen();
            return;
        }
        previousValue = result;
        currentInput - formatNumber(result);
    } else {
        previousValue = inputValue;
    }

    pendingOperator = op;
    overwrite = true;
    updateScreen(); 
}

async function equals() {
    if (pendingOperator === null || previousValue === null) return;
    const inputValue = parseFloat(currentInput);
    const result = await compute(previousValue, inputValue, pendingOperator);
    if (result === null) {
        updateScreen();
        return;
    }
    currentInput = formatNumber(result);
    previousValue = null;
    pendingOperator = null;
    overwrite = true;
    updateScreen();
}

document.querySelectorAll('.key').forEach((btn) => {
    btn.addEventListener('click', () => {
        const { digit, action, op } = btn.dataset;
        if (digit !== undefined) inputDigit(digit);
        else if (op !== undefined) setOperator(op);
        else if (action === 'clear') clearAll();
        else if (action === 'backspace') backspace();
        else if (action === 'percent') percent();
        else if (action === 'decimal') decimal();
        else if (action === 'equals') equals();
    });
});

const KEY_OP_MAP = { '+': '+', '-': '-', '*': '×', '/': '÷' };

window.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') {
        inputDigit(e.key);
    } else if (e.key === '.') {
        inputDecimal();
    } else if (KEY_OP_MAP[e.key]) {
        setOperator(KEY_OP_MAP[e.key]);
    } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        equals();
    } else if (e.key === 'backspace') {
        backspace();
    } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        clearAll();
    } else if (e.key === '%') {
        percent();
    } else {
        return;
    }
});

updateScreen();