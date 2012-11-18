var StopIteration = new Class({
  Extends: Error,
  toString: function() {
    return 'StopIteration';
  }
});

function Iterator(xs) {
  return {
    _pos: 0,
    next: function() {
      if (this._pos >= xs.length) {
        throw new StopIteration();
      }
      return xs[this._pos++];
    },
    peek: function() {
      return xs[this._pos];
    }
  };
}
