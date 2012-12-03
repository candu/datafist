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
 * Given a sorted iterator and a predicate, FilterIterator produces a new
 * sorted iterator containing only those elements matching the predicate.
 */
function FilterIterator(iter, p) {
  var _iter = iter,
      _cur = null,
      _stop = false;
  function _next() {
    try {
      while (true) {
        _cur = _iter.next();
        if (p(_cur)) {
          break;
        }
      }
    } catch (e) {
      if (!(e instanceof StopIteration)) {
        throw e;
      }
      _stop = true;
    }
  }
  _next();
  return {
    next: function() {
      if (_stop) {
        throw new StopIteration();
      }
      var ret = _cur;
      _next();
      return ret;
    },
    peek: function() {
      if (_stop) {
        throw new StopIteration();
      }
      return _cur;
    }
  }
}

/**
 * Given N sorted iterators, UnionIterator produces a single
 * sorted iterator that returns unique sorted values from all N
 * iterators.
 */
function UnionIterator(iters) {
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
  var _curIter = null;
  var _lastValue = null;
  function _next() {
    if (_q.empty() && _curIter === null) {
      throw new StopIteration();
    }
    var ret = _curIter.peek();
    try {
      _curIter.next();
      _curIter.peek();
      _q.push(_curIter);
    } catch (e) {
      if (!(e instanceof StopIteration)) {
        throw e;
      }
    }
    _curIter = null;
    if (!_q.empty()) {
      _curIter = _q.pop();
    }
    return ret;
  };
  if (!_q.empty()) {
    _curIter = _q.pop();
  }
  return {
    next: function() {
      while (true) {
        var curValue = _next();
        if (curValue !== _lastValue) {
          _lastValue = curValue;
          return curValue;
        }
      }
    },
    peek: function() {
      if (_q.empty() && _curIter === null) {
        throw new StopIteration();
      }
      return _curIter.peek();
    }
  };
}
