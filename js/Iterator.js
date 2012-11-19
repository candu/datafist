var StopIteration = new Class({
  Extends: Error,
  toString: function() {
    return 'StopIteration';
  }
});

function Iterator(xs) {
  var _pos = 0;
  function _test() {
    if (_pos >= xs.length) {
      throw new StopIteration();
    }
  }
  return {
    next: function() {
      _test();
      return xs[_pos++];
    },
    peek: function() {
      _test();
      return xs[_pos];
    },
  };
}

/**
 * Given N sorted iterators, MergeIterator produces a single
 * sorted iterator that returns the elements of all N iterators in order.
 */
function MergeIterator(iters) {
  iters = iters.filter(function(a) {
    try {
      a.peek();
      return true;
    } catch (e) {
      if (!(e instanceof StopIteration)) {
        throw e;
      }
    }
    return false;
  });
  var _q = Heap(iters, function(a, b) {
    return a.peek() - b.peek();
  });
  var _cur = null;
  if (!_q.empty()) {
    _cur = _q.pop();
  }
  return {
    next: function() {
      if (_q.empty() && _cur === null) {
        throw new StopIteration();
      }
      var ret = _cur.peek();
      try {
        _cur.next();
        _cur.peek();
        _q.push(_cur);
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
      }
      _cur = null;
      if (!_q.empty()) {
        _cur = _q.pop();
      }
      return ret;
    },
    peek: function() {
      return _cur.peek();
    }
  };
}
