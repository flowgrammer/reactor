/*global require, setTimeout*/
var stream = require('riffle-async');

(function () {
  var o = {};
  var _o = {};

  o.salutation = stream(function(out, x) { out(x); });

  o.name = stream(function(out, x) { out(x); });
  
  _o.exclaim = stream(function(out, x) {
    setTimeout(function () {
      out(x + '!!!');
    }, 1000);
  });

  _o.concat = stream.join(function(out, x, y) {
    out(x + ' ' + y);
  });

  o.underscores = stream(function (out, x) {
    out('__' + x + '__');
  });

  o.heal = stream.any(function(out, s) {
    stream.lib.pipe({o: o, r: _o},
      (function () {/*o.salutation {0} r.exclaim {0} r.concat {0} o.underscores, o.name {0} r.concat:1 */})
      .format(!s.isStopping ? '>' : '|'));
    out(s);
  });

  stream.lib.val('greeter').invoke(o); // register module  
}());

// TODO needs testing
stream.log().input(stream.lib.val('greeter'));
// TODO supply name
// TOOD salutation
