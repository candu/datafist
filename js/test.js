'use strict';

var TestUtils = {
  makeChannel: function(x, until, n) {
    until = until || 3;
    n = n || until;
    return {
      op: 'gen-regular',
      args: {
        gen: {op: 'constant', args: {x: x}},
        since: 0,
        until: until,
        n: n
      }
    };
  },
  typeEqual: function(t1, t2) {
    ok(Type.equal(t1, t2));
  }
};

QUnit.test('Object', function() {
  equal(Object.isEmpty({}), true);
  equal(Object.isEmpty({a:{}}), false);
});

QUnit.test('Interval', function() {
  function intervalCheck(a, b, expected) {
    var ab = JSON.stringify(Interval.intersect(a, b)),
        ba = JSON.stringify(Interval.intersect(b, a)),
        c = JSON.stringify(expected);
    equal(ab, c);
    equal(ba, c);
  }

  intervalCheck([1, 4], [2, 3], [2, 3]);
  intervalCheck([1, 3], [2, 4], [2, 3]);
  intervalCheck([1, 2], [3, 4], null);
  intervalCheck([0, 0], [-1, 1], [0, 0]);
  intervalCheck([1, 4], [1, 3], [1, 3]);
  intervalCheck([1, 4], [2, 4], [2, 4]);
  intervalCheck([0, 1], [0, 1], [0, 1]);
  intervalCheck([1, 1], [1, 1], [1, 1]);
});

QUnit.test('TimeDelta', function() {
  // basic
  equal(TimeDelta.parse('millisecond'), 1);
  equal(TimeDelta.parse('second'), 1000);
  equal(TimeDelta.parse('minute'), 1000 * 60);
  equal(TimeDelta.parse('hour'), 1000 * 60 * 60);
  equal(TimeDelta.parse('day'), 1000 * 60 * 60 * 24);
  equal(TimeDelta.parse('week'), 1000 * 60 * 60 * 24 * 7);

  // abbreviations
  equal(TimeDelta.parse('ms'), 1);
  equal(TimeDelta.parse('msec'), 1);
  equal(TimeDelta.parse('s'), 1000);
  equal(TimeDelta.parse('sec'), 1000);
  equal(TimeDelta.parse('m'), 1000 * 60);
  equal(TimeDelta.parse('min'), 1000 * 60);
  equal(TimeDelta.parse('h'), 1000 * 60 * 60);
  equal(TimeDelta.parse('hr'), 1000 * 60 * 60);
  equal(TimeDelta.parse('d'), 1000 * 60 * 60 * 24);
  equal(TimeDelta.parse('w'), 1000 * 60 * 60 * 24 * 7);
  equal(TimeDelta.parse('wk'), 1000 * 60 * 60 * 24 * 7);

  // numbers
  equal(TimeDelta.parse('2 ms'), 2);
  equal(TimeDelta.parse('3 seconds'), 3 * 1000);
  equal(TimeDelta.parse('4 min'), 4 * 1000 * 60);
  equal(TimeDelta.parse('5 hours'), 5 * 1000 * 60 * 60);
  equal(TimeDelta.parse('6 d'), 6 * 1000 * 60 * 60 * 24);
  equal(TimeDelta.parse('7 weeks'), 7 * 1000 * 60 * 60 * 24 * 7);

  // singular
  equal(TimeDelta.parse('1 millisecond'), 1);
  equal(TimeDelta.parse('1 second'), 1000);
  equal(TimeDelta.parse('1 minute'), 1000 * 60);
  equal(TimeDelta.parse('1 hour'), 1000 * 60 * 60);
  equal(TimeDelta.parse('1 day'), 1000 * 60 * 60 * 24);
  equal(TimeDelta.parse('1 week'), 1000 * 60 * 60 * 24 * 7);

  // negative numbers
  equal(TimeDelta.parse('-2 ms'), -2);
  equal(TimeDelta.parse('-3 seconds'), -3 * 1000);
  equal(TimeDelta.parse('-4 min'), -4 * 1000 * 60);
  equal(TimeDelta.parse('-5 hours'), -5 * 1000 * 60 * 60);
  equal(TimeDelta.parse('-6 d'), -6 * 1000 * 60 * 60 * 24);
  equal(TimeDelta.parse('-7 weeks'), -7 * 1000 * 60 * 60 * 24 * 7);

  // no space
  equal(TimeDelta.parse('2ms'), 2);
  equal(TimeDelta.parse('3s'), 3 * 1000);
  equal(TimeDelta.parse('4m'), 4 * 1000 * 60);
  equal(TimeDelta.parse('5h'), 5 * 1000 * 60 * 60);
  equal(TimeDelta.parse('6d'), 6 * 1000 * 60 * 60 * 24);
  equal(TimeDelta.parse('7w'), 7 * 1000 * 60 * 60 * 24 * 7);

  // floating point
  equal(TimeDelta.parse('0.25s'), 0.25 * 1000);
});

QUnit.test('Iterator', function() {
  var it;

  // empty
  it = Iterator([]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);

  // next
  it = Iterator([3, 2, 1]);
  equal(it.next(), 3);
  equal(it.next(), 2);
  equal(it.next(), 1);
  throws(function() { return it.next(); }, StopIteration);

  // peek
  it = Iterator([3, 2, 1]);
  it.next();
  equal(it.peek(), 2);
  it.next();
  equal(it.peek(), 1);
});

QUnit.test('FilterIterator', function() {
  function filterCheck(a, p) {
    var expected = a.filter(p),
        it = FilterIterator(Iterator(a), p);
    for (var i = 0; i < expected.length; i++) {
      equal(it.peek(), expected[i]);
      equal(it.next(), expected[i]);
    }
    throws(function() { return it.peek(); }, StopIteration);
    throws(function() { return it.next(); }, StopIteration);
  }

  function p(x) {
    return x % 2 === 0;
  }

  filterCheck([], p);
  filterCheck([73], p);
  filterCheck([6], p);
  filterCheck([1, 3, 5, 7, 9], p);
  filterCheck([2, 4, 6, 8, 10], p);
  filterCheck([1, 2, 3, 4, 5], p);
});

QUnit.test('MergeIterator', function() {
  var it;

  // empty
  it = MergeIterator([]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);
  it = MergeIterator([Iterator([])]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);
  it = MergeIterator([Iterator([]), Iterator([]), Iterator([])]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);

  // 1-way merge
  var a = [6, 17, 73];
  it = MergeIterator([Iterator(a)]);
  for (var i = 0; i < a.length; i++) {
    equal(it.next(), a[i]);
  }
  throws(function() { return it.next(); }, StopIteration);

  // 3-way merge
  var a = [1, 5, 8];
  var b = [2, 3, 9];
  var c = [4, 6, 7];
  it = MergeIterator([Iterator(a), Iterator(b), Iterator(c)]);
  for (var i = 1; i <= 9; i++) {
    equal(it.next(), i);
  }
  throws(function() { return it.next(); }, StopIteration);

  // duplicate values
  var a = [2, 3, 5, 7];
  var b = [1, 2, 3, 5, 8];
  var expected = [1, 2, 2, 3, 3, 5, 5, 7, 8];
  it = MergeIterator([Iterator(a), Iterator(b)]);
  for (var i = 0; i < expected.length; i++) {
    equal(it.next(), expected[i]);
  }
  throws(function() { return it.next(); }, StopIteration);

  // nested merge iterators
  var a = [1, 10],
      b = [2, 9],
      c = [3, 8],
      d = [4, 7],
      e = [5, 6],
      it1 = MergeIterator([Iterator(a), Iterator(c), Iterator(e)]),
      it2 = MergeIterator([Iterator(b), Iterator(d)]),
      it = MergeIterator([it1, it2]);
  for (var i = 1; i <= 10; i++) {
    equal(it.next(), i);
  }
  throws(function() { return it.next(); }, StopIteration);

});

QUnit.test('UnionIterator', function() {
  // empty
  var it = UnionIterator([]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);
  var it = UnionIterator([Iterator([])]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);
  var it = UnionIterator([Iterator([]), Iterator([]), Iterator([])]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);

  // duplicate values
  var a = [2, 3, 5, 7];
  var b = [1, 2, 3, 5, 8];
  var expected = [1, 2, 3, 5, 7, 8];
  it = UnionIterator([Iterator(a), Iterator(b)]);
  for (var i = 0; i < expected.length; i++) {
    equal(it.next(), expected[i]);
  }
  throws(function() { return it.next(); }, StopIteration);
});

QUnit.test('IntersectionIterator', function() {
  // empty
  var it = IntersectionIterator([]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);
  var it = IntersectionIterator([Iterator([])]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);
  var it = IntersectionIterator([Iterator([]), Iterator([]), Iterator([])]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);

  // duplicate values
  var a = [2, 3, 5, 7];
  var b = [1, 2, 3, 5, 8];
  var expected = [2, 3, 5];
  it = IntersectionIterator([Iterator(a), Iterator(b)]);
  for (var i = 0; i < expected.length; i++) {
    equal(it.next(), expected[i]);
  }
  throws(function() { return it.next(); }, StopIteration);
});

QUnit.test('Heap', function() {
  // empty
  var q = Heap([]);
  equal(q.empty(), true);

  // heapsort
  var xs = [3, 5, 6, 1, 4, 7, 2],
      q = Heap(xs),
      i = 0;
  while (!q.empty()) {
    equal(q.pop(), ++i);
  }
  equal(i, xs.length);

  // random heapsort
  var xs = [],
      N = 10;
  for (var i = 0; i < N; i++) {
    xs.push(Math.random());
  }
  var q = Heap(xs),
      last = -Infinity;
  for (var i = 0; i < N; i++) {
    var cur = q.pop();
    ok(cur >= last);
    last = cur;
  }

  // push
  var xs = [],
      q = Heap(xs),
      N = 10;
  for (var i = 0; i < N; i++) {
    q.push(Math.random());
    ok(q.check());
  }
});

QUnit.test('Region', function() {
  var r = Region([[1, 1], [-1, 1], [-1, -1], [1, -1]]);
  ok(r.contains([0, 0]));
  var foundOutside = false;
  for (var i = 0; i < 1000; i++) {
    var p = [Random.uniform(-1, 1), Random.uniform(-1, 1)];
    if (!r.contains(p)) {
      foundOutside = true;
      break;
    }
  }
  ok(!foundOutside);
  ok(!r.contains([-3, 4]));
  ok(!r.contains([-1 - 1e-12, -1 - 1e-12]));
  ok(!r.contains([-1 - 1e-12, -1 + 1e-12]));
  ok(!r.contains([-1 + 1e-12, -1 - 1e-12]));
  ok(!r.contains([1 + 1e-12, 1 + 1e-12]));
  ok(!r.contains([1 + 1e-12, 1 - 1e-12]));
  ok(!r.contains([1 - 1e-12, 1 + 1e-12]));
});

QUnit.test('SExp', function() {
  function jsonEqual(a, b) {
    equal(JSON.stringify(a), JSON.stringify(b));
  }

  function parseThrows(s, e) {
    throws(function() { return SExp.parse(s); }, e);
  }

  // empty strings
  parseThrows('', /parse failed/);
  parseThrows('    ', /parse failed/);

  // parens
  parseThrows('(', /parse failed/);
  parseThrows(')', /parse failed/);
  jsonEqual(SExp.parse('()'), []);
  jsonEqual(SExp.parse('((()))'), [[[]]]);
  parseThrows('((())', /parse failed/);
  parseThrows('((())))', /parse failed/);

  // atom
  jsonEqual(SExp.parse('a'), 'a');
  jsonEqual(SExp.parse('abcd'), 'abcd');
  parseThrows('a b', /parse failed/);

  // string
  jsonEqual(SExp.parse('"test"'), '"test"');
  jsonEqual(SExp.parse('"a b"'), '"a b"');
  jsonEqual(SExp.parse('("a b")'), ['"a b"']);
  jsonEqual(SExp.parse('("a(b)")'), ['"a(b)"']);
  jsonEqual(SExp.parse('("a\\"b\\"")'), ['"a\\"b\\""']);

  // list
  jsonEqual(SExp.parse('(a)'), ['a']);
  jsonEqual(SExp.parse('(a b)'), ['a', 'b']);
  parseThrows('a b)', /parse failed/);
  parseThrows('(a b', /parse failed/);

  // mix
  jsonEqual(SExp.parse('(a (b c) d)'), ['a', ['b', 'c'], 'd']);

  // whitespace
  jsonEqual(SExp.parse('(      a)'), ['a']);
  jsonEqual(SExp.parse('(a      )'), ['a']);
  jsonEqual(SExp.parse('(   a   )'), ['a']);
  jsonEqual(SExp.parse('(a)      '), ['a']);
  jsonEqual(SExp.parse('   (a)   '), ['a']);

  // unparse
  equal(SExp.unparse('42'), '42');
  equal(SExp.unparse([]), '()');
  equal(SExp.unparse(['42']), '(42)');
  equal(SExp.unparse([[], [], []]), '(() () ())');
  equal(SExp.unparse(['+', ['*', '2', '3'], ['/', '81', '9']]),
        '(+ (* 2 3) (/ 81 9))');

  // many
  jsonEqual(SExp.parseMany('() () ()'), [[], [], []]);
  jsonEqual(SExp.parseMany('  () () ()  '), [[], [], []]);
  jsonEqual(SExp.parseMany('()()()'), [[], [], []]);
  jsonEqual(SExp.parseMany('()(a)()'), [[], ['a'], []]);
  jsonEqual(SExp.parseMany('() ( a ) ()'), [[], ['a'], []]);

  // equal
  ok(SExp.equal(SExp.parse('(+ 2 2)'), SExp.parse('(+ 2 2)')));
  ok(!SExp.equal(SExp.parse('(+ 2 2)'), SExp.parse('(* 2 2)')));

  // depth
  equal(SExp.depth(SExp.parse('42')), 0);
  equal(SExp.depth(SExp.parse('(+ 1 2)')), 1);
  equal(SExp.depth(SExp.parse('(view-line (+ c1 c2))')), 2);
  equal(SExp.depth(SExp.parse('(view-line (gen-regular (gaussian 0 1) 0 100 100))')), 3);
});

QUnit.test('evaluateAtom', function() {
  // number
  equal(Fist.evaluateAtom('1'), 1);
  equal(Fist.evaluateAtom('-1'), -1);
  equal(Fist.evaluateAtom('3.25'), 3.25);

  // boolean
  equal(Fist.evaluateAtom(true), true);
  equal(Fist.evaluateAtom(false), false);

  // string
  equal(Fist.evaluateAtom('foo'), 'foo');

  // ops
  equal(Fist.evaluateAtom('+'), OpsArith.add);
});

QUnit.test('OpsArith', function() {
  // number
  equal(Fist.evaluate({
    op: '+',
    args: {values: [1, 2]}
  }), 3);
  equal(Fist.evaluate({
    op: '+',
    args: {values: [1, 2, 3]}
  }), 6);
  equal(Fist.evaluate({
    op: '-',
    args: {a: 73}
  }), -73);
  equal(Fist.evaluate({
    op: '-',
    args: {a: 45, b: 3}
  }), 42);
  equal(Fist.evaluate({
    op: '*',
    args: {values: [2, 3, 5, 7]}
  }), 210);
  equal(Fist.evaluate({
    op: '/',
    args: {a: 19, b: 8}
  }), 2.375);
  equal(Fist.evaluate({
    op: '//',
    args: {a: 19, b: 8}
  }), 2);
  equal(Fist.evaluate({
    op: '%',
    args: {a: 19, b: 8}
  }), 3);
  equal(Fist.evaluate({
    op: '//*',
    args: {a: 19, b: 8}
  }), 16);
  equal(Fist.evaluate({
    op: '//*',
    args: {a: 19, b: 8}
  }), Fist.evaluate({
    op: '*',
    args: {values: [{op: '//', args: {a: 19, b: 8}}, 8]}
  }));

  // channel
  var c = Fist.evaluate({
    op: '+',
    args: {values: [TestUtils.makeChannel(1), TestUtils.makeChannel(2)]}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 3);
  }
  var c = Fist.evaluate({
    op: '-',
    args: {a: TestUtils.makeChannel(45), b: TestUtils.makeChannel(3)}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 42);
  }
  var c = Fist.evaluate({
    op: '*',
    args: {values: [TestUtils.makeChannel(5), TestUtils.makeChannel(7)]}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 35);
  }
  var c = Fist.evaluate({
    op: '/',
    args: {a: TestUtils.makeChannel(19), b: TestUtils.makeChannel(8)}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 2.375);
  }
  var c = Fist.evaluate({
    op: '//',
    args: {a: TestUtils.makeChannel(19), b: TestUtils.makeChannel(8)}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 2);
  }

  // mixed
  var c = Fist.evaluate({
    op: '+',
    args: {values: [35, TestUtils.makeChannel(1), 4, TestUtils.makeChannel(2)]}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 42);
  }
  var c = Fist.evaluate({
    op: '-',
    args: {a: 10, b: TestUtils.makeChannel(2)}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 8);
  }
  var c = Fist.evaluate({
    op: '*',
    args: {values: [TestUtils.makeChannel(2), 73]}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 146);
  }
  var c = Fist.evaluate({
    op: '/',
    args: {a: TestUtils.makeChannel(19), b: 8}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 2.375);
  }
  var c = Fist.evaluate({
    op: '//',
    args: {a: TestUtils.makeChannel(19), b: 8}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 2);
  }
  var c = Fist.evaluate({
    op: '%',
    args: {a: TestUtils.makeChannel(19), b: 8}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 3);
  }
  var c = Fist.evaluate({
    op: '//*',
    args: {a: TestUtils.makeChannel(19), b: 8}
  });
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 16);
  }
});

QUnit.test('OpsMath', function() {
  var EPSILON = 1e-6;
  function epsilonEqual(a, b) {
    ok(Math.abs(a - b) < EPSILON);
  }

  // number
  equal(Fist.evaluate({op: 'sqrt', args: {x: 289}}), 17);
  equal(Fist.evaluate({op: 'pow', args: {x: 2, a: 8}}), 256);
  epsilonEqual(Fist.evaluate({op: 'exp', args: {x: 0}}), 1);
  epsilonEqual(Fist.evaluate({op: 'exp', args: {x: 1}}), Math.E);
  equal(Fist.evaluate({op: 'exp', args: {a: 4, x: 3}}), 64);
  epsilonEqual(Fist.evaluate({op: 'log', args: {x: 1}}), 0);
  epsilonEqual(Fist.evaluate({op: 'log', args: {x: 2.7182818}}), 1);
  equal(Fist.evaluate({op: 'log', args: {x: 64, b: 4}}), 3);
  equal(Fist.evaluate({op: 'abs', args: {x: -73}}), 73);
  equal(Fist.evaluate({op: 'abs', args: {x: 42}}), 42);
  equal(Fist.evaluate({op: 'floor', args: {x: 2}}), 2);
  equal(Fist.evaluate({op: 'floor', args: {x: 2.3}}), 2);
  equal(Fist.evaluate({op: 'floor', args: {x: 2.7}}), 2);
  equal(Fist.evaluate({op: 'round', args: {x: 2}}), 2);
  equal(Fist.evaluate({op: 'round', args: {x: 2.3}}), 2);
  equal(Fist.evaluate({op: 'round', args: {x: 2.7}}), 3);
  equal(Fist.evaluate({op: 'ceil', args: {x: 2}}), 2);
  equal(Fist.evaluate({op: 'ceil', args: {x: 2.3}}), 3);
  equal(Fist.evaluate({op: 'ceil', args: {x: 2.7}}), 3);
});

QUnit.test('OpsTime', function() {
  // simultaneous iteration
  var c = Fist.evaluate({
    op: 'time-shift',
    args: {c: TestUtils.makeChannel(42), dt: -7}
  });
  var it1 = c.iter(),
      it2 = c.iter();
  for (var i = 0; i < 3; i++) {
    equal(c.at(it1.peek()), 42);
    equal(it1.next(), i - 7);
    equal(c.at(it2.peek()), 42);
    equal(it2.next(), i - 7);
  }
  throws(function() { return it1.next(); }, StopIteration);
  throws(function() { return it2.next(); }, StopIteration);
});

QUnit.test('OpsSmooth', function() {
  var EPSILON = 1e-6;
  function epsilonEqual(a, b) {
    ok(Math.abs(a - b) < EPSILON);
  }

  var data = [
    {t: 0, x: 2},
    {t: 1, x: 0},
    {t: 3, x: 5}
  ];
  var c = OpsSmooth.rollingAverage.call(Fist, {
    c: new DataChannel(data),
    halfLife: 1
  });
  epsilonEqual(c.at(0), 2);
  epsilonEqual(c.at(1), 1);
  epsilonEqual(c.at(3), 4);

  var data = [
    {t: 0, x: 2},
    {t: 1, x: 4},
    {t: 3, x: 5}
  ];
  var c = OpsSmooth.slidingWindow.call(Fist, {
    c: new DataChannel(data),
    windowSize: 2
  });
  epsilonEqual(c.at(0), 2);
  epsilonEqual(c.at(1), 3);
  epsilonEqual(c.at(3), 4.5);

  var data = [
    {t: 0, x: 2},
    {t: 1, x: 4},
    {t: 2, x: 6},
    {t: 3, x: 5},
    {t: 4, x: 9}
  ];
  var c = OpsSmooth.medianFilter.call(Fist, {
    c: new DataChannel(data),
    filterSize: 1
  });
  epsilonEqual(c.at(0), 3);
  epsilonEqual(c.at(1), 4);
  epsilonEqual(c.at(2), 5);
  epsilonEqual(c.at(3), 6);
  epsilonEqual(c.at(4), 7);

  var data = [
    {t: 0, x: 2},
    {t: 2, x: 4},
    {t: 6, x: 5},
  ];
  var c = OpsSmooth.rateOfChange.call(Fist, {
    c: new DataChannel(data),
    rateUnit: 2
  });
  epsilonEqual(c.at(0), 0);
  epsilonEqual(c.at(2), 2);
  epsilonEqual(c.at(6), 0.5);

  var data = [
    {t: 0, x: 2},
    {t: 1, x: 4},
    {t: 3, x: 5}
  ];
  var c = OpsSmooth.cumulativeSum.call(Fist, {
    c: new DataChannel(data)
  });
  epsilonEqual(c.at(0), 2);
  epsilonEqual(c.at(1), 6);
  epsilonEqual(c.at(3), 11);
});

QUnit.test('OpsFilterValue', function() {
  // see http://en.wikipedia.org/wiki/Normal_distribution
  var FOUR_NINES_SIG = 3.89,
      TWO_DEV_PROB = 0.954499736104;

  function checkInequality(filter, args, p) {
    var filterArgs = {
      c: {
        op: 'gen-regular',
        args: {
          gen: {op: 'gaussian', args: {mu: 3, sigma: 1}},
          since: 0,
          until: 1000,
          n: 1000
        }
      }
    };
    Object.append(filterArgs, args);
    var c = Fist.evaluate({op: filter, args: filterArgs}),
        found = 0,
        N = 1000,
        it = c.iter();
    while (true) {
      try {
        var x = it.next();
        if (Math.random < 0.01) console.log(x);
        found++;
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    // estimate this as a binomial process
    var error = Math.abs(p * N - found),
        limit = FOUR_NINES_SIG * Math.sqrt(N * p * (1 - p));
    ok(error < limit);
  }

  checkInequality('value-less-than', {x: 1}, (1 - TWO_DEV_PROB) / 2);
  checkInequality('value-at-most', {x: 1}, (1 - TWO_DEV_PROB) / 2);
  checkInequality('value-at-least', {x: 5}, (1 - TWO_DEV_PROB) / 2);
  checkInequality('value-more-than', {x: 5}, (1 - TWO_DEV_PROB) / 2);
  checkInequality('value-between', {x1: 1, x2: 5}, TWO_DEV_PROB);

  var innerChannel = {
    op: '+',
    args: {
      values: [TestUtils.makeChannel(1, 10), TestUtils.makeChannel(1, 10, 5)],
    }
  };
  var c = Fist.evaluate({op: 'value-is', args: {c: innerChannel, x: 1}});
  for (var t = 0; t < 10; t++) {
    console.log(t, c.at(t));
    if (t % 2 == 0) {
      equal(c.at(t), 0);
    } else {
      equal(c.at(t), 1);
    }
  }

  var c = Fist.evaluate({op: 'value-is-not', args: {c: innerChannel, x: 1}});
  for (var t = 0; t < 10; t++) {
    if (t % 2 == 0) {
      equal(c.at(t), 2);
    } else {
      equal(c.at(t), 0);
    }
  }
});

QUnit.test('OpsFilterTime', function() {
  // since
  var c = Fist.evaluate({
    op: 'time-since',
    args: {c: TestUtils.makeChannel(1, 10), since: 3}
  });
  for (var t = 0; t < 10; t++) {
    if (t >= 3) {
      equal(c.at(t), 1);
    } else {
      equal(c.at(t), 0);
    }
  }

  // until
  var c = Fist.evaluate({
    op: 'time-until',
    args: {c: TestUtils.makeChannel(1, 10), until: 7}
  });
  for (var t = 0; t < 10; t++) {
    if (t < 7) {
      equal(c.at(t), 1);
    } else {
      equal(c.at(t), 0);
    }
  }

  // between
  var c = Fist.evaluate({
    op: 'time-between',
    args: {c: TestUtils.makeChannel(1, 10), since: 3, until: 7}
  });
  for (var t = 0; t < 10; t++) {
    if (t >= 3 && t < 7) {
      equal(c.at(t), 1);
    } else {
      equal(c.at(t), 0);
    }
  }
});

QUnit.test('GensData', function() {
  var FOUR_NINES_SIG = 3.89;

  var constant = Fist.evaluate({op: 'constant', args: {x: 42}});
  ok(constant instanceof Function);
  var N = 1000,
      foundMismatch = false;
  for (var i = 0; i < N; i++) {
    if (constant(i) !== 42) {
      foundMismatch = true;
      break;
    }
  }
  ok(!foundMismatch);

  var uniform = Fist.evaluate({op: 'uniform', args: {min: 1, max: 3}});
  ok(uniform instanceof Function);
  var total = 0,
      N = 1000;
  for (var i = 0; i < N; i++) {
    total += uniform(i);
  }
  var error = Math.abs(2 - total / N);
  var limit = FOUR_NINES_SIG * Math.sqrt(1 / (3 * N));
  ok(error < limit);

  var choice = Fist.evaluate({op: 'choice', args: {values: [0, 0, 0, 1, 1]}});
  ok(choice instanceof Function);
  var N = 1000,
      p = 0.6,
      bins = [0, 0];
  for (var i = 0; i < N; i++) {
    bins[choice(i)]++;
  }
  var error = Math.abs(p * N - bins[0]);
  var limit = FOUR_NINES_SIG * Math.sqrt(N * p * (1 - p));
  ok(error < limit);

  var gaussian = Fist.evaluate({op: 'gaussian', args: {mu: 4, sigma: 1}});
  ok(gaussian instanceof Function);
  var total = 0,
      N = 1000;
  for (var i = 0; i < N; i++) {
    total += gaussian(i);
  }
  var error = Math.abs(4 - total / N);
  var limit = FOUR_NINES_SIG * Math.sqrt(1 / N);
  ok(error < limit);
});

// TODO: test iteration
QUnit.test('GensChannel', function() {
  var FOUR_NINES_SIG = 3.89,
      constant = {op: 'constant', args: {x: 42}};

  var c = Fist.evaluate({
    op: 'gen-regular',
    args: {gen: constant, since: 0, until: 60, n: 10}
  });
  for (var t = 0; t < 60; t += 6) {
    equal(c.at(t), 42);
  }

  var c = Fist.evaluate({
    op: 'gen-uniform',
    args: {gen: constant, since: 0, until: 60, n: 10}
  });
  var pointsFound = 0;
  for (var t = 0; t < 60; t++) {
    if (c.at(t) === 42) {
      pointsFound++;
    }
  }
  equal(pointsFound, 10);

  var c = Fist.evaluate({
    op: 'gen-poisson',
    args: {gen: constant, since: 0, until: 10000, rate: 10}
  });
  var N = 10000,
      rate = 10,
      pointsFound = 0;
  for (var t = 0; t < N; t++) {
    if (c.at(t) === 42) {
      pointsFound++;
    }
  }
  var error = Math.abs(N / rate - pointsFound);
  // let's be extra-permissive, since the gen-poisson implementation uses
  // a couple of heuristics to prevent Math.log(0) and duplicate timestamps
  var limit = 2 * FOUR_NINES_SIG * rate;
  ok(error < limit);
});

QUnit.test('RowLoader', function() {
  function jsonEqual(a, b) {
    equal(JSON.stringify(a), JSON.stringify(b));
  }

  // empty data
  var data = '';
  throws(function() { RowLoader.load(data); }, DataImportError);
  var data = 't,x';
  throws(function() { RowLoader.load(data); }, DataImportError);

  // basic data
  var data = 't,x\n1,2\n3,4';
  jsonEqual(RowLoader.load(data), [{t: "1", x: "2"}, {t: "3", x: "4"}]);
});

QUnit.test('ChannelExtractor', function() {
  function jsonEqual(a, b) {
    equal(JSON.stringify(a), JSON.stringify(b));
  }

  // missing data
  var data = RowLoader.load(
    't,a,b\n1986-07-31,42,1729\n1986-08-01,,6\n1986-08-02,73,'
  );
  jsonEqual(ChannelExtractor.extract(['t'], ['a', 'b'], data), {
    'a': [
      {t: 523177200000, x: 42},
      {t: 523350000000, x: 73}
    ],
    'b': [
      {t: 523177200000, x: 1729},
      {t: 523263600000, x: 6}
    ]
  });

  // duplicate timestamps
  var data = RowLoader.load([
    't,x',
    '1986-07-31,1',
    '1986-07-31,2',
    '1986-07-31,3',
    '1986-08-02,4',
    '1986-08-02,5',
  ].join('\n'));
  jsonEqual(ChannelExtractor.extract(['t'], ['x'], data), {
    'x': [
      {t: 523177200000, x: 1},
      {t: 523177200001, x: 2},
      {t: 523177200002, x: 3},
      {t: 523350000000, x: 4},
      {t: 523350000001, x: 5}
    ]
  });

  // UNIX timestamped data (Epoch seconds)
  var data = RowLoader.load([
    't,x',
    '1354650000,3',
    '1354650060,2',
    '1354650120,1'
  ].join('\n'));
  jsonEqual(ChannelExtractor.extract(['t'], ['x'], data), {
    'x': [
      {t: 1354650000000, x: 3},
      {t: 1354650060000, x: 2},
      {t: 1354650120000, x: 1}
    ]
  });

  // JS timestamped data (Epoch milliseconds)
  var data = RowLoader.load([
    't,x',
    '1354650180000,3',
    '1354650240000,2',
    '1354650300000,1'
  ].join('\n'));
  jsonEqual(ChannelExtractor.extract(['t'], ['x'], data), {
    'x': [
      {t: 1354650180000, x: 3},
      {t: 1354650240000, x: 2},
      {t: 1354650300000, x: 1}
    ]
  });

  // simple counts
  var data = RowLoader.load([
    'date,caffeine,sweets,alcohol,supplements',
    '2012-01-16,0,1,2,0',
    '2012-01-17,1,2,4,0',
    '2012-01-18,1,1,4,1'
  ].join('\n'));
  jsonEqual(ChannelExtractor.extract(['date'], ['caffeine', 'sweets', 'alcohol', 'supplements'], data), {
    'caffeine': [
      {t: 1326700800000, x: 0},
      {t: 1326787200000, x: 1},
      {t: 1326873600000, x: 1}
    ],
    'sweets': [
      {t: 1326700800000, x: 1},
      {t: 1326787200000, x: 2},
      {t: 1326873600000, x: 1}
    ],
    'alcohol': [
      {t: 1326700800000, x: 2},
      {t: 1326787200000, x: 4},
      {t: 1326873600000, x: 4}
    ],
    'supplements': [
      {t: 1326700800000, x: 0},
      {t: 1326787200000, x: 0},
      {t: 1326873600000, x: 1}
    ],
  });

  // dollar format
  var data = RowLoader.load([
    'TYPE,DATE,USAGE,UNITS,COST,NOTES',
    'Natural gas usage,2012-10-31,1.02,therms,$0.97,',
    'Natural gas usage,2012-11-01,2.04,therms,$2.05,',
    'Natural gas usage,2012-11-02,1.02,therms,$1.03,'
  ].join('\n'));
  jsonEqual(ChannelExtractor.extract(['DATE'], ['USAGE', 'COST'], data), {
    'USAGE': [
      {t: 1351666800000, x: 1.02},
      {t: 1351753200000, x: 2.04},
      {t: 1351839600000, x: 1.02}
    ],
    'COST': [
      {t: 1351666800000, x: 0.97},
      {t: 1351753200000, x: 2.05},
      {t: 1351839600000, x: 1.03}
    ]
  });

  // split date/time columns
  var data = RowLoader.load([
    'TYPE,DATE,START TIME,END TIME,USAGE,UNITS,COST,NOTES',
    'Electric usage,2012-10-31,00:00,00:59,1.16,kWh,$0.15,',
    'Electric usage,2012-10-31,01:00,01:59,0.97,kWh,$0.12,',
    'Electric usage,2012-10-31,02:00,02:59,0.73,kWh,$0.09,',
  ].join('\n'));
  jsonEqual(ChannelExtractor.extract(['DATE', 'START TIME'], ['USAGE', 'COST'], data), {
    'USAGE': [
      {t: 1351666800000, x: 1.16},
      {t: 1351670400000, x: 0.97},
      {t: 1351674000000, x: 0.73}
    ],
    'COST': [
      {t: 1351666800000, x: 0.15},
      {t: 1351670400000, x: 0.12},
      {t: 1351674000000, x: 0.09}
    ]
  });

  // reverse chronological order
  var data = RowLoader.load([
    'Date,Open,Close,Volume',
    '2012-11-30,27.26,28.00,126947100',
    '2012-11-29,26.50,27.32,88759700',
    '2012-11-28,25.94,26.36,49205600'
  ].join('\n'));
  jsonEqual(ChannelExtractor.extract(['Date'], ['Open', 'Close', 'Volume'], data), {
    'Open': [
      {t: 1354089600000, x: 25.94},
      {t: 1354176000000, x: 26.50},
      {t: 1354262400000, x: 27.26}
    ],
    'Close': [
      {t: 1354089600000, x: 26.36},
      {t: 1354176000000, x: 27.32},
      {t: 1354262400000, x: 28.00}
    ],
    'Volume': [
      {t: 1354089600000, x: 49205600},
      {t: 1354176000000, x: 88759700},
      {t: 1354262400000, x: 126947100}
    ]
  });

  // different date format, thousands separators
  var data = RowLoader.load([
    'Date,Close,Volume',
    '"Dec 3, 2012","1,409.46","517,130,581"',
    '"Nov 30, 2012","1,416.18","836,942,757"',
    '"Nov 29, 2012","1,415.95","509,860,077"'
  ].join('\n'));
  jsonEqual(ChannelExtractor.extract(['Date'], ['Close', 'Volume'], data), {
    'Close': [
      {t: 1354176000000, x: 1415.95},
      {t: 1354262400000, x: 1416.18},
      {t: 1354521600000, x: 1409.46}
    ],
    'Volume': [
      {t: 1354176000000, x: 509860077},
      {t: 1354262400000, x: 836942757},
      {t: 1354521600000, x: 517130581}
    ]
  });

  // DMY format (new Date() won't parse this!)
  // TODO: uncomment once loading is more robust
  /*
  var data = RowLoader.load([
    'Time,Close',
    '03.12.2002 16:00:00.000,1.57100',
    '04.12.2002 16:00:00.000,1.57560',
    '05.12.2002 16:00:00.000,1.57300'
  ].join('\n'));
  jsonEqual(ChannelExtractor.extract(['Time'], ['Close'], data), {
    'Close': [
      {t: 1038960000000, x: 1.57100},
      {t: 1039046400000, x: 1.57560},
      {t: 1039132800000, x: 1.57300}
    ]
  });
  */
});

QUnit.test('Type', function() {
  // PrimitiveType.match()
  TestUtils.typeEqual(NumberType.match(NumberType), NumberType);
  TestUtils.typeEqual(NumberType.match(StringType), null);

  // TimeType.match(), TimeDeltaType.match()
  TestUtils.typeEqual(TimeType.match(NumberType), NumberType);
  TestUtils.typeEqual(TimeDeltaType.match(StringType), StringType);
  TestUtils.typeEqual(TimeType.match(LocationType), null);

  // ChannelType.match()
  TestUtils.typeEqual(ChannelType(NumberType).match(NumberType), null);
  TestUtils.typeEqual(
    ChannelType(NumberType).match(ChannelType(NumberType)),
    ChannelType(NumberType)
  );

  // FunctionType.match()
  var t1 = FunctionType({x: NumberType}, StringType),
      t2 = FunctionType({x: StringType}, StringType),
      t3 = FunctionType({x: NumberType}, NumberType);
  TestUtils.typeEqual(t1.match(t1), t1);
  TestUtils.typeEqual(t1.match(t2), null);
  TestUtils.typeEqual(t1.match(t3), null);

  // OrType.match()
  TestUtils.typeEqual(
    OrType(NumberType, StringType).match(NumberType),
    NumberType
  );
  TestUtils.typeEqual(
    OrType(NumberType, StringType).match(StringType),
    StringType
  );
  TestUtils.typeEqual(
    OrType(NumberType, StringType).match(LocationType),
    null
  );
  TestUtils.typeEqual(
    MaybeChannelType(NumberType).match(NumberType),
    NumberType
  );
  TestUtils.typeEqual(
    MaybeChannelType(NumberType).match(ChannelType(NumberType)),
    ChannelType(NumberType)
  );
  TestUtils.typeEqual(
    MaybeChannelType(OrType(NumberType, StringType)).match(
      ChannelType(StringType)
    ),
    ChannelType(StringType)
  );

  // MaybeType.match()
  TestUtils.typeEqual(MaybeType(NumberType).match(NumberType), NumberType);
  TestUtils.typeEqual(MaybeType(NumberType).match(undefined), undefined);
  TestUtils.typeEqual(MaybeType(NumberType).match(StringType), null);

  // ListType.match()
  TestUtils.typeEqual(ListType(NumberType).match([]), null);
  TestUtils.typeEqual(ListType(NumberType).match([NumberType]), [NumberType]);
  TestUtils.typeEqual(
    ListType(NumberType).match([NumberType, NumberType]),
    [NumberType, NumberType]
  );
  TestUtils.typeEqual(
    ListType(OrType(NumberType, StringType)).match([StringType, NumberType]),
    [StringType, NumberType]
  );

  // RefType.resolve()
  TestUtils.typeEqual(RefType('a').resolve({'a': NumberType}), NumberType);
  TestUtils.typeEqual(RefType('a').resolve({'b': NumberType}), null);
  TestUtils.typeEqual(RefType('a').resolve({'a': undefined}), undefined);

  // MaxType.resolve()
  TestUtils.typeEqual(MaxType().resolve({}), null);
  TestUtils.typeEqual(MaxType(StringType).resolve({}), StringType);

  TestUtils.typeEqual(
    MaxType(NumberType, StringType).resolve({}),
    null
  );
  TestUtils.typeEqual(
    MaxType(ChannelType(NumberType), StringType).resolve({}),
    null
  );

  TestUtils.typeEqual(
    MaxType(NumberType, NumberType).resolve({}),
    NumberType
  );
  TestUtils.typeEqual(
    MaxType(NumberType, ChannelType(NumberType)).resolve({}),
    ChannelType(NumberType)
  );
  TestUtils.typeEqual(
    MaxType(ChannelType(NumberType), NumberType).resolve({}),
    ChannelType(NumberType)
  );
  TestUtils.typeEqual(
    MaxType(ChannelType(NumberType), ChannelType(NumberType)).resolve({}),
    ChannelType(NumberType)
  );

  TestUtils.typeEqual(
    MaxType(RefType('a'), RefType('b')).resolve({
      a: NumberType,
      b: ChannelType(NumberType)
    }),
    ChannelType(NumberType)
  );
  TestUtils.typeEqual(
    MaxType(RefType('xs')).resolve({
      xs: [NumberType, ChannelType(NumberType)]
    }),
    ChannelType(NumberType)
  );
  TestUtils.typeEqual(
    MaxType(RefType('xs'), RefType('y')).resolve({
      xs: [NumberType, NumberType],
      y: ChannelType(NumberType)
    }),
    ChannelType(NumberType)
  );
});

QUnit.test('Fist', function() {
  TestUtils.typeEqual(
    Fist.evaluateType('+'),
    FunctionType({
      values: ListType(MaybeChannelType(NumberType))
    }, MaxType(RefType('values')))
  );

  // _applyTypes
  TestUtils.typeEqual(Fist._applyTypes(
    FunctionType({x: NumberType}, NumberType),
    {x: NumberType}
  ), NumberType);
  TestUtils.typeEqual(Fist._applyTypes(
    FunctionType({x: OrType(NumberType, StringType)}, RefType('x')),
    {x: StringType}
  ), StringType);
  TestUtils.typeEqual(Fist._applyTypes(
    FunctionType({xs: ListType(MaybeChannelType(NumberType))}, MaxType(RefType('xs'))),
    {xs: [NumberType, ChannelType(NumberType)]}
  ), ChannelType(NumberType));

  // atoms
  TestUtils.typeEqual(Fist.evaluateType(42), NumberType);
  TestUtils.typeEqual(Fist.evaluateType(3.14), NumberType);
  TestUtils.typeEqual(Fist.evaluateType(6.18e-1), NumberType);
  TestUtils.typeEqual(Fist.evaluateType('foo'), StringType);

  // arithmetic operations on numbers
  TestUtils.typeEqual(Fist.evaluateType({
    op: '+',
    args: {values: [1, 3, 5]}
  }), NumberType);

  // progressive buildup to view
  TestUtils.typeEqual(Fist.evaluateType(
    TestUtils.makeChannel(42)
  ), ChannelType(NumberType));
  TestUtils.typeEqual(Fist.evaluateType({
    op: '/',
    args: {a: TestUtils.makeChannel(2, 10), b: TestUtils.makeChannel(0.5, 10)}
  }), ChannelType(NumberType));
  TestUtils.typeEqual(Fist.evaluateType({
    op: 'view-line',
    args: {
      channels: [{
        op: '/',
        args: {a: TestUtils.makeChannel(2, 10), b: TestUtils.makeChannel(0.5, 10)}
      }]
    }
  }), ViewType);

  // filters
  TestUtils.typeEqual(Fist.evaluateType({
    op: 'value-more-than',
    args: {c: TestUtils.makeChannel(1, 10), x: 9000}
  }), ChannelType(NumberType));
});
