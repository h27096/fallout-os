'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { format } = require('./time-format.js');
test('local 24-hour display handles midnight, noon, afternoon and padding without mutation', () => {
 for (const [h,m,s,expected] of [[0,0,0,'00:00:00'],[9,5,2,'09:05:02'],[12,0,0,'12:00:00'],[14,35,42,'14:35:42'],[23,59,59,'23:59:59']]) {
  const date = new Date(2026, 10, 1, h, m, s), timestamp = date.getTime();
  assert.equal(format(date,true),expected);
  assert.equal(format(date),expected.slice(0,5));
  assert.equal(date.getTime(),timestamp);
 }
});
