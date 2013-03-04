var Time = {
  get: function(x) {
    // TODO: think about timezone handling?
    if (typeOf(x) === 'string') {
      return +(new Date(x));
    }
    return x;
  }
};
