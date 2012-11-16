test("SExp", function() {
  function jsonEqual(a, b) {
    equal(JSON.stringify(a), JSON.stringify(b));
  }

  // empty strings
  jsonEqual(SExp.parse(''), null);
  jsonEqual(SExp.parse('    '), null);

  // parens
  jsonEqual(SExp.parse('('), null);
  jsonEqual(SExp.parse(')'), null);
  jsonEqual(SExp.parse('()'), []);
  jsonEqual(SExp.parse('((()))'), [[[]]]);
  jsonEqual(SExp.parse('((())'), null);
  jsonEqual(SExp.parse('((())))'), null);

  // atom
  jsonEqual(SExp.parse('a'), 'a');
  jsonEqual(SExp.parse('abcd'), 'abcd');
  jsonEqual(SExp.parse('a b'), null);

  // list
  jsonEqual(SExp.parse('(a)'), ['a']);
  jsonEqual(SExp.parse('(a b)'), ['a', 'b']);
  jsonEqual(SExp.parse('a b)'), null);
  jsonEqual(SExp.parse('(a b'), null);

  // mix
  jsonEqual(SExp.parse('(a (b c) d)'), ['a', ['b', 'c'], 'd']);

  // whitespace
  jsonEqual(SExp.parse('(      a)'), ['a']);
  jsonEqual(SExp.parse('(a      )'), ['a']);
  jsonEqual(SExp.parse('(   a   )'), ['a']);
  jsonEqual(SExp.parse('(a)      '), ['a']);
  jsonEqual(SExp.parse('   (a)   '), ['a']);
});
