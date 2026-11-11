'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const m = require('../extension/gesture-math.js');
test('swipe 40px advances 20 seconds', () => assert.equal(m.seekDelta(40,20),20));
test('negative swipe rewinds and is clamped', () => {
  assert.equal(m.seekDelta(-20,20),-10);
  assert.equal(m.seekDelta(1000,30),240);
});
test('seek target never negative or beyond duration', () => {
  assert.equal(m.targetTime(5,100,-15),0);
  assert.equal(m.targetTime(90,100,30),100);
});
test('hold directional speeds', () => {
  const cfg={holdSpeed:2,rightSpeed:3,leftSpeed:1.5};
  assert.equal(m.holdSpeed(0,cfg),2);
  assert.equal(m.holdSpeed(35,cfg),3);
  assert.equal(m.holdSpeed(-35,cfg),1.5);
});
test('format playback time', () => {
  assert.equal(m.formatTime(15),'0:15');
  assert.equal(m.formatTime(754),'12:34');
  assert.equal(m.formatTime(3632),'1:00:32');
});
