const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculate, format } = require('./calculator-math.js');
test('arithmetic precedence, signs, decimals, powers and scientific functions', () => {
    for (const [expression, result] of [['2+3*4',14],['(2+3)×4',20],['7÷2',3.5],['.5+1.25',1.75],['-2^2',-4],['(-2)^2',4],['2^-2',.25],['2^3^2',512],['200*10%',20],['200+10%',200.1],['sqrt(81)',9],['log(100)',2],['ln(e)',1],['1e-3*1000',1],['sin(30)',.5],['cos(60)',.5],['tan(45)',1]]) assert.ok(Math.abs(calculate(expression)-result)<1e-10, expression);
    assert.equal(format(calculate('0.1+0.2')), '0.3');
    assert.ok(Math.abs(calculate('sin(pi/2)','rad')-1)<1e-10);
});
test('reject invalid, nonfinite and executable input', () => {
    for (const expression of ['', '1/0', '0/0', 'sqrt(-1)', 'log(0)', 'tan(90)', '2^99999', '(2+3', '1..2', '2(3)', 'alert(1)', 'Math.random()', '1;2', 'constructor(1)', '1e999', '('.repeat(513)]) assert.throws(()=>calculate(expression), expression);
});
