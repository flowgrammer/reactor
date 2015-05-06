/*global require, setTimeout*/
var riffle = require('riffle-async');
var reactor = require('./reactor.js');

var globalMutable;

var lettersC = function () {
  globalMutable = 'c';
  setTimeout(reactor.done, Math.random() * 1000);
};
var lettersB = function () {
  globalMutable = 'b';
  setTimeout(lettersC, Math.random() * 1000);
};
var lettersA = function () {
  globalMutable = 'a';
  setTimeout(lettersB, Math.random() * 1000);
};
var numbersC = function () {
  globalMutable = '3';
  setTimeout(reactor.done, Math.random() * 1000);
};
var numbersB = function () {
  globalMutable = '2';
  setTimeout(numbersC, Math.random() * 1000);
};
var numbersA = function () {
  globalMutable = '1';
  setTimeout(numbersB, Math.random() * 1000);
};
var lettersZ = function () {
  globalMutable = 'z';
  setTimeout(reactor.done, Math.random() * 1000);
};
var lettersY = function () {
  globalMutable = 'y';
  setTimeout(lettersZ, Math.random() * 1000);
};
var lettersX = function () {
  globalMutable = 'x';
  setTimeout(lettersY, Math.random() * 1000);
};

setInterval(function () {
  process.stdout.write(globalMutable);
}, 100);

reactor.setImmediate(lettersA);
reactor.setImmediate(numbersA);
reactor.setImmediate(lettersX);
