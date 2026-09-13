/* Bounded recursive-descent arithmetic parser; never executes JavaScript. */
'use strict';
const RobcoMath = (() => {
    function calculate(source, angle = 'deg') {
        if (typeof source !== 'string' || !source.trim()) throw Error('Enter an expression.');
        if (source.length > 512) throw Error('Expression too long (512 characters maximum).');
        const text = source.toLowerCase().replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').replaceAll('π', 'pi');
        const tokens = text.match(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[^\s]/g) || [];
        let index = 0;
        const peek = () => tokens[index];
        const take = value => peek() === value ? (++index, true) : false;
        const finite = value => { if (!Number.isFinite(value)) throw Error('Result is undefined or too large.'); return value; };
        function primary() {
            if (take('(')) { const value = sum(); if (!take(')')) throw Error('Missing closing parenthesis.'); return value; }
            const token = tokens[index++];
            if (/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/.test(token || '')) return finite(Number(token));
            if (token === 'pi') return Math.PI;
            if (token === 'e') return Math.E;
            if (['sqrt', 'sin', 'cos', 'tan', 'ln', 'log', 'abs'].includes(token)) {
                if (!take('(')) throw Error('Functions need parentheses.');
                const value = sum();
                if (!take(')')) throw Error('Missing closing parenthesis.');
                const radians = angle === 'deg' ? value * Math.PI / 180 : value;
                if (token === 'tan' && Math.abs(Math.cos(radians)) < 1e-14) throw Error('Tangent is undefined at this angle.');
                const functions = { sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10,
                    sin: () => Math.sin(radians), cos: () => Math.cos(radians), tan: () => Math.tan(radians) };
                return finite(functions[token](value));
            }
            throw Error('Expected a number, function or parenthesis.');
        }
        function postfix() { let value = primary(); while (take('%')) value /= 100; return value; }
        function power() { const value = postfix(); return take('^') ? finite(value ** unary()) : value; }
        function unary() { if (take('+')) return unary(); if (take('-')) return -unary(); return power(); }
        function product() {
            let value = unary();
            while (peek() === '*' || peek() === '/') {
                const operator = tokens[index++], right = unary();
                if (operator === '/' && right === 0) throw Error('Cannot divide by zero.');
                value = finite(operator === '*' ? value * right : value / right);
            }
            return value;
        }
        function sum() {
            let value = product();
            while (peek() === '+' || peek() === '-') {
                const operator = tokens[index++], right = product();
                value = finite(operator === '+' ? value + right : value - right);
            }
            return value;
        }
        const result = finite(sum());
        if (index !== tokens.length) throw Error('Unexpected input. Use an operator between values.');
        return Object.is(result, -0) ? 0 : result;
    }
    const format = value => String(Number(value.toPrecision(12)));
    return { calculate, format };
})();
if (typeof module !== 'undefined') module.exports = RobcoMath;
