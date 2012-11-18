QUnit.test("Iterator", function() {
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

QUnit.test("Heap", function() {
  // heapsort
  var xs = [3, 5, 6, 1, 4, 7, 2],
      q = Heap(xs),
      i = 0;
  while (!q.empty()) {
    equal(q.pop(), ++i);
  }
});

QUnit.test("SExp", function() {
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
});

QUnit.test("evaluateAtom", function() {
  // empty
  throws(function() { Fist.evaluateAtom(''); }, /empty atom not allowed/);

  // number
  equal(Fist.evaluateAtom('1'), 1);
  equal(Fist.evaluateAtom('-1'), -1);
  equal(Fist.evaluateAtom('3.25'), 3.25);

  // boolean
  equal(Fist.evaluateAtom('true'), true);
  equal(Fist.evaluateAtom('false'), false);

  // string
  equal(Fist.evaluateAtom('"foo"'), "foo");
  equal(Fist.evaluateAtom('"foo: \\"bar\\""'), "foo: \"bar\"");
  throws(function() { Fist.evaluateAtom("'foo'"); }, /unrecognized atom/);

  // ops
  equal(Fist.evaluateAtom('+'), OpsArith.plus);
});

QUnit.test("OpsArith", function() {
  equal(Fist.execute('(+ 1 2)'), 3);
  equal(Fist.execute('(+ 1 2 3)'), 6);
  equal(Fist.execute('(- 1)'), -1);
  equal(Fist.execute('(- 73 42)'), 31);
  equal(Fist.execute('(* 2 3)'), 6);
  equal(Fist.execute('(* 2 3 5 7)'), 210);
  equal(Fist.execute('(/ 17 5)'), 3.4);
  equal(Fist.execute('(// 17 5)'), 3);
  equal(Fist.execute('(% 17 5)'), 2);
});
