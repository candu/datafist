function Heap(xs, cmp) {
  cmp = cmp || function(a, b) { return a - b; };
  var _size = xs.length;
  function _swap(i, j) {
    var tmp = xs[i];
    xs[i] = xs[j];
    xs[j] = tmp;
  }
  function _left(i) {
    return 2 * i + 1;
  }
  function _right(i) {
    return 2 * i + 2;
  }
  function _parent(i) {
    return Math.floor((i - 1) / 2);
  }
  function _leaf(i) {
    return i >= Math.ceil((_size - 1) / 2);
  }
  function _sift(i) {
    while (!_leaf(i)) {
      var L = _left(i),
          R = _right(i),
          m = L;
      if (R < _size && cmp(xs[R], xs[L]) < 0) {
        m = R;
      }
      if (cmp(xs[i], xs[m]) <= 0) {
        break;
      }
      _swap(i, m);
      i = m;
    }
  }
  function pop() {
    _swap(0, _size - 1);
    if (--_size > 0) {
      _sift(0);
    }
    return xs[_size];
  }
  function push(x) {
    var i = _size++;
    xs[i] = x;
    while (i > 0) {
      var P = _parent(i);
      if (cmp(xs[P], xs[i]) < 0) {
        break;
      }
      _swap(i, P);
      i = P;
    }
  }
  for (var i = Math.floor(_size / 2) - 1; i >= 0; i--) {
    _sift(i);
  }
  return {
    pop: pop,
    push: push,
    empty: function() { return _size == 0; },
    // check heap property - for testing
    check: function() {
      for (var i = 0; !_leaf(i); i++) {
        var L = _left(i),
            R = _right(i);
        if (cmp(xs[i], xs[L]) >= 0) {
          return false;
        }
        if (R < _size && cmp(xs[i], xs[R]) >= 0) {
          return false;
        }
      }
      return true;
    }
  };
}
