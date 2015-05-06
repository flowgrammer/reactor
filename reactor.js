/*global module, setTimeout*/

var reactor = (function () {
  var isLocked;
  var queue = [];
  var run = function () {
    if (isLocked) return;
    if (!queue.length) return;
    isLocked = true;
    var event = queue.shift();
    setTimeout(function () { event[0].apply(event[1], event.slice(2)); }, 0);
  };
  var me = {};
  me.setImmediate = function (fn, thisArg, arg1, arg2, etc) {
    // you can lock without queuing a function
    if (fn) queue.push([].slice.call(arguments));
    run();
  };
  me.done = function () {
    isLocked = false;
    run();
  };
  return me;
}());

module.exports = reactor;
