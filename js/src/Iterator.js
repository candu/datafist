function Iterator(xs) {
  this._pos = 0;
  this._xs = xs || [];
}
Iterator.prototype._test = function() {
  if (this._pos >= this._xs.length) {
    throw new StopIteration();
  }
};
Iterator.prototype.next = function() {
  this._test();
  return this._xs[this._pos++];
};
Iterator.prototype.peek = function() {
  this._test();
  return this._xs[this._pos];
};

/**
 * Given a sorted iterator and a predicate, FilterIterator produces a new
 * sorted iterator containing only those elements matching the predicate.
 */
function FilterIterator(iter, p) {
  this._iter = iter;
  this._p = p || function(x) { return !!x; };
  this._cur = null;
  this._stop = false;
  this._next();
}
FilterIterator.prototype._next = function() {
  try {
    while (true) {
      this._cur = this._iter.next();
      if (this._p(this._cur)) {
        break;
      }
    }
  } catch (e) {
    if (!(e instanceof StopIteration)) {
      throw e;
    }
    this._stop = true;
  }
};
FilterIterator.prototype.next = function() {
  if (this._stop) {
    throw new StopIteration();
  }
  var ret = this._cur;
  this._next();
  return ret;
};
FilterIterator.prototype.peek = function() {
  if (this._stop) {
    throw new StopIteration();
  }
  return this._cur;
};

/**
 * Given N sorted iterators, MergeIterator produces a single sorted iterator
 * that returns the union multiset of values from all N iterators.
 */
function MergeIterator(iters) {
  this._iters = iters.filter(function(a) {
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
  this._q = new Heap(this._iters, function(a, b) {
    return a.peek() - b.peek();
  });
  this._curIter = null;
  if (!this._q.empty()) {
    this._curIter = this._q.pop();
  }
}
MergeIterator.prototype.next = function() {
  if (this._q.empty() && this._curIter === null) {
    throw new StopIteration();
  }
  var ret = this._curIter.peek();
  try {
    this._curIter.next();
    this._curIter.peek();
    this._q.push(this._curIter);
  } catch (e) {
    if (!(e instanceof StopIteration)) {
      throw e;
    }
  }
  this._curIter = null;
  if (!this._q.empty()) {
    this._curIter = this._q.pop();
  }
  return ret;
};
MergeIterator.prototype.peek = function() {
  if (this._q.empty() && this._curIter === null) {
    throw new StopIteration();
  }
  return this._curIter.peek();
};

/**
 * Given N sorted iterators, UnionIterator produces a single sorted iterator
 * that returns the union set of values from all N iterators.
 */
function UnionIterator(iters) {
  this._iter = new MergeIterator(iters);
  this._lastValue = null;
}
UnionIterator.prototype.next = function() {
  while (true) {
    var curValue = this._iter.next();
    if (curValue !== this._lastValue) {
      this._lastValue = curValue;
      return curValue;
    }
  }
};
UnionIterator.prototype.peek = function() {
  return this._iter.peek();
};

/**
 * Given N sorted iterators, IntersectionIterator produces a single sorted
 * iterator that returns the intersection set of values from all N iterators.
 */
function IntersectionIterator(iters) {
  this._iter = new MergeIterator(iters);
  this._lastValue = null;
  this._lastCount = 0;
  this._fullCount = iters.length;
}
IntersectionIterator.prototype.next = function() {
  while (true) {
    var curValue = this._iter.next();
    if (curValue !== this._lastValue) {
      this._lastValue = curValue;
      this._lastCount = 0;
    }
    this._lastCount++;
    if (this._lastCount === this._fullCount) {
      return curValue;
    }
  }
};
IntersectionIterator.prototype.peek = function() {
  return this._iter.peek();
};
