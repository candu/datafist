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
  it = UnionIterator([]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);
  it = UnionIterator([Iterator([])]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);
  it = UnionIterator([Iterator([]), Iterator([]), Iterator([])]);
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
  it = IntersectionIterator([]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);
  it = IntersectionIterator([Iterator([])]);
  throws(function() { return it.peek(); }, StopIteration);
  throws(function() { return it.next(); }, StopIteration);
  it = IntersectionIterator([Iterator([]), Iterator([]), Iterator([])]);
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
});

QUnit.test('evaluateAtom', function() {
  // empty
  throws(function() { fist.evaluateAtom(''); }, /empty atom not allowed/);

  // number
  equal(fist.evaluateAtom('1'), 1);
  equal(fist.evaluateAtom('-1'), -1);
  equal(fist.evaluateAtom('3.25'), 3.25);

  // boolean
  equal(fist.evaluateAtom('true'), true);
  equal(fist.evaluateAtom('false'), false);

  // string
  equal(fist.evaluateAtom('"foo"'), 'foo');
  equal(fist.evaluateAtom('"foo: \\"bar\\""'), 'foo: "bar"');
  throws(function() { fist.evaluateAtom("'foo'"); }, /unrecognized atom/);

  // ops
  equal(fist.evaluateAtom('+'), OpsArith.add);
});

QUnit.test('Keywords', function() {
  // define
  equal(fist.execute('(define x 21)'), null);
  equal(fist.execute('(+ x x)'), 42);
});

QUnit.test('OpsArith', function() {
  // number
  equal(fist.execute('(+ 1 2)'), 3);
  equal(fist.execute('(+ 1 2 3)'), 6);
  equal(fist.execute('(- 45 3)'), 42);
  equal(fist.execute('(* 2 3 5 7)'), 210);
  equal(fist.execute('(/ 19 8)'), 2.375);
  equal(fist.execute('(// 19 8)'), 2);
  equal(fist.execute('(% 19 8)'), 3);
  equal(fist.execute('(//* 19 8)'), 16);
  equal(fist.execute('(//* 19 8)'), fist.execute('(* (// 19 8) 8)'));

  // channel
  var c = fist.execute(
    '(+ ((gen-regular 0 3 3) (constant 1)) ((gen-regular 0 3 3) (constant 2)))'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 3);
  }
  var c = fist.execute(
    '(- ((gen-regular 0 3 3) (constant 45)) ((gen-regular 0 3 3) (constant 3)))'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 42);
  }
  var c = fist.execute(
    '(* ((gen-regular 0 3 3) (constant 5)) ((gen-regular 0 3 3) (constant 7)))'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 35);
  }
  var c = fist.execute(
    '(/ ((gen-regular 0 3 3) (constant 19)) ((gen-regular 0 3 3) (constant 8)))'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 2.375);
  }
  var c = fist.execute(
    '(// ((gen-regular 0 3 3) (constant 19)) ((gen-regular 0 3 3) (constant 8)))'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 2);
  }

  // mixed
  var c = fist.execute(
    '(+ 35 ((gen-regular 0 3 3) (constant 2)) 4 ((gen-regular 0 3 3) (constant 1)))'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 42);
  }
  var c = fist.execute(
    '(- 10 ((gen-regular 0 3 3) (constant 2)))'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 8);
  }
  var c = fist.execute(
    '(* ((gen-regular 0 3 3) (constant 2)) 73)'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 146);
  }
  var c = fist.execute(
    '(/ ((gen-regular 0 3 3) (constant 19)) 8)'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 2.375);
  }
  var c = fist.execute(
    '(// ((gen-regular 0 3 3) (constant 19)) 8)'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 2);
  }
  var c = fist.execute(
    '(% ((gen-regular 0 3 3) (constant 19)) 8)'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 3);
  }
  var c = fist.execute(
    '(//* ((gen-regular 0 3 3) (constant 19)) 8)'
  );
  for (var i = 0; i < 3; i++) {
    equal(c.at(i), 16);
  }
});

QUnit.test('OpsChannel', function() {
  // simultaneous iteration
  var c = fist.execute(
    '(time-shift ((gen-regular 0 3 3) (constant 42)) -7)'
  );
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

QUnit.test('OpsFilterComparison', function() {
  // see http://en.wikipedia.org/wiki/Normal_distribution
  var FOUR_NINES_SIG = 3.89,
      TWO_DEV_PROB = 0.954499736104;

  function checkInequality(filter, p) {
    var c = fist.execute(
      '(' + filter + ' ((gen-regular 0 1000 1000) (gaussian 3 1)))'
    );
    var found = 0,
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

  checkInequality('(< 1)', (1 - TWO_DEV_PROB) / 2);
  checkInequality('(<= 1)', (1 - TWO_DEV_PROB) / 2);
  checkInequality('(>= 5)', (1 - TWO_DEV_PROB) / 2);
  checkInequality('(> 5)', (1 - TWO_DEV_PROB) / 2);
  checkInequality('(value-between 1 5)', TWO_DEV_PROB);

  var c = fist.execute(
    '((= 1) (+ ((gen-regular 0 10 10) (constant 1)) ((gen-regular 0 10 5) (constant 1))))'
  );
  for (var t = 0; t < 10; t++) {
    if (t % 2 == 0) {
      equal(c.at(t), 0);
    } else {
      equal(c.at(t), 1);
    }
  }

  var c = fist.execute(
    '((!= 1) (+ ((gen-regular 0 10 10) (constant 1)) ((gen-regular 0 10 5) (constant 1))))'
  );
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
  var c = fist.execute(
    '((since 3) ((gen-regular 0 10 10) (constant 1)))'
  );
  for (var t = 0; t < 10; t++) {
    if (t >= 3) {
      equal(c.at(t), 1);
    } else {
      equal(c.at(t), 0);
    }
  }

  // until
  var c = fist.execute(
    '((until 7) ((gen-regular 0 10 10) (constant 1)))'
  );
  for (var t = 0; t < 10; t++) {
    if (t < 7) {
      equal(c.at(t), 1);
    } else {
      equal(c.at(t), 0);
    }
  }

  // between
  var c = fist.execute(
    '((between 3 7) ((gen-regular 0 10 10) (constant 1)))'
  );
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

  var constant = fist.execute('(constant 42)');
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

  var uniform = fist.execute('(uniform 1 3)');
  ok(uniform instanceof Function);
  var total = 0,
      N = 1000;
  for (var i = 0; i < N; i++) {
    total += uniform(i);
  }
  var error = Math.abs(2 - total / N);
  var limit = FOUR_NINES_SIG * Math.sqrt(1 / (3 * N));
  ok(error < limit);

  var choice = fist.execute('(choice "foo" "foo" "foo" "baz" "baz")');
  ok(choice instanceof Function);
  var N = 1000,
      p = 0.6,
      bins = { foo: 0, baz: 0};
  for (var i = 0; i < N; i++) {
    bins[choice(i)]++;
  }
  var error = Math.abs(p * N - bins.foo);
  var limit = FOUR_NINES_SIG * Math.sqrt(N * p * (1 - p));
  ok(error < limit);

  var gaussian = fist.execute('(gaussian 4 1)');
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
  var FOUR_NINES_SIG = 3.89;
  var constant = fist.execute('(constant 42)');

  var regular = fist.execute('(gen-regular 0 60 10)');
  ok(regular instanceof Function);
  var c = regular.call(fist, [constant]);
  for (var t = 0; t < 60; t += 6) {
    equal(c.at(t), 42);
  }

  var uniform = fist.execute('(gen-uniform 0 60 10)');
  ok(uniform instanceof Function);
  var c = uniform.call(fist, [constant]);
  var pointsFound = 0;
  for (var t = 0; t < 60; t++) {
    if (c.at(t) === 42) {
      pointsFound++;
    }
  }
  equal(pointsFound, 10);

  var poisson = fist.execute('(gen-poisson 0 10000 10)');
  ok(poisson instanceof Function);
  var c = poisson.call(fist, [constant]);
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
      {t: 1354262400000, x: 27.26},
      {t: 1354176000000, x: 26.50},
      {t: 1354089600000, x: 25.94}
    ],
    'Close': [
      {t: 1354262400000, x: 28.00},
      {t: 1354176000000, x: 27.32},
      {t: 1354089600000, x: 26.36}
    ],
    'Volume': [
      {t: 1354262400000, x: 126947100},
      {t: 1354176000000, x: 88759700},
      {t: 1354089600000, x: 49205600}
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
      {t: 1354521600000, x: 1409.46},
      {t: 1354262400000, x: 1416.18},
      {t: 1354176000000, x: 1415.95}
    ],
    'Volume': [
      {t: 1354521600000, x: 517130581},
      {t: 1354262400000, x: 836942757},
      {t: 1354176000000, x: 509860077}
    ]
  });

  // DMY format (new Date() won't parse this!)
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
});

QUnit.test('Fist', function() {
  // TODO: fix this when I actually implement proper typing :)

  // atoms
  equal(fist.getType('42'), 'number');
  equal(fist.getType('3.14'), 'number');
  equal(fist.getType('6.18e-1'), 'number');
  equal(fist.getType('"foo"'), 'string');

  // invalid atoms
  equal(fist.getType('blargh'), null);

  // views
  equal(fist.getType('view-sparkline'), 'function');

  // channels
  equal(fist.getType('((gen-regular 0 10 10) (constant 1))'), 'channel');

  // filters
  equal(fist.getType('>'), 'function');
  equal(fist.getType('(> 9000)'), 'function');
  equal(fist.getType('(since 0)'), 'function');
  equal(fist.getType('(between 6 101)'), 'function');
});

QUnit.test('ViewGraphState', function() {
  var g = new ViewGraphState();

  // empty
  var cmds = g.toFist();
  equal(cmds.length, 0);

  // partial
  g.addNode('c1', null, 0, 0);
  g.addNode('c2', null, 40, 0);
  g.addNode('+', null, 30, 10);
  g.addEdge(0, 2);
  g.addEdge(1, 2);
  var cmds = g.toFist();
  equal(cmds, '(+ c1 c2)');

  // full
  g.addNode('v1', null, 10, 20);
  g.addNode('c3', null, 60, 0);
  g.addNode('v2', null, 50, 20);
  g.addNode('c4', null, 20, 0);
  g.addEdge(0, 5);
  g.addEdge(1, 5);
  g.addEdge(2, 3);
  g.addEdge(6, 3);

  var cmds = g.toFist();
  equal(cmds, '(v1 c4 (+ c1 c2)) (v2 c1 c2) c3');
});
