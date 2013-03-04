function Heap(xs, cmp) {
  this._xs = xs || [];
  this._cmp = cmp || function(a, b) { return a - b; };
  this._size = this._xs.length;
  for (var i = Math.floor(this._size / 2) - 1; i >= 0; i--) {
    this._sift(i);
  }
}
Heap.prototype._swap = function(i, j) {
  var tmp = this._xs[i];
  this._xs[i] = this._xs[j];
  this._xs[j] = tmp;
};
Heap.prototype._left = function(i) {
  return 2 * i + 1;
};
Heap.prototype._right = function(i) {
  return 2 * i + 2;
};
Heap.prototype._parent = function(i) {
  return Math.floor((i - 1) / 2);
};
Heap.prototype._leaf = function(i) {
  return i >= Math.ceil((this._size - 1) / 2);
};
Heap.prototype._sift = function(i) {
  while (!this._leaf(i)) {
    var L = this._left(i),
        R = this._right(i),
        m = L;
    if (R < this._size && this._cmp(this._xs[R], this._xs[L]) < 0) {
      m = R;
    }
    if (this._cmp(this._xs[i], this._xs[m]) <= 0) {
      break;
    }
    this._swap(i, m);
    i = m;
  }
};
Heap.prototype.pop = function() {
  this._swap(0, this._size - 1);
  if (--this._size > 0) {
    this._sift(0);
  }
  return this._xs[this._size];
};
Heap.prototype.push = function(x) {
  var i = this._size++;
  this._xs[i] = x;
  while (i > 0) {
    var P = this._parent(i);
    if (this._cmp(this._xs[P], this._xs[i]) < 0) {
      break;
    }
    this._swap(i, P);
    i = P;
  }
};
Heap.prototype.empty = function() {
  return this._size == 0;
};
// check heap property - for testing
Heap.prototype.check = function() {
  for (var i = 0; !this._leaf(i); i++) {
    var L = this._left(i),
        R = this._right(i);
    if (this._cmp(this._xs[i], this._xs[L]) >= 0) {
      return false;
    }
    if (R < this._size && this._cmp(this._xs[i], this._xs[R]) >= 0) {
      return false;
    }
  }
  return true;
};
