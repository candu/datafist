var StopIteration = new Class({
  Extends: Error,
  toString: function() {
    return 'StopIteration';
  }
});
