QUnit.test('Object', function() {
  equal(Object.isEmpty({}), true);
  equal(Object.isEmpty({a:{}}), false);
});

QUnit.test('Iterator', function() {
  var it;

  // empty
  it = Iterator([]);
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

QUnit.test('MergeIterator', function() {
  var it;

  // empty
  it = MergeIterator([]);
  throws(function() { return it.next(); }, StopIteration);
  it = MergeIterator([Iterator([])]);
  throws(function() { return it.next(); }, StopIteration);
  it = MergeIterator([Iterator([]), Iterator([]), Iterator([])]);
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
  var expected = [1, 2, 3, 5, 7, 8];
  it = MergeIterator([Iterator(a), Iterator(b)]);
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
