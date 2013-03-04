var TimeDelta = {
  _regex: /^(-?\d+(\.\d+)?([eE][-+]?\d+)?)?\s*(\w+)$/,
  _unit: function(s) {
    switch (s) {
      case 'ms':
      case 'msec':
      case 'msecs':
      case 'millisecond':
      case 'milliseconds':
        return 1;
      case 's':
      case 'sec':
      case 'secs':
      case 'second':
      case 'seconds':
        return 1000;
      case 'm':
      case 'min':
      case 'mins':
      case 'minute':
      case 'minutes':
        return 1000 * 60;
      case 'h':
      case 'hr':
      case 'hrs':
      case 'hour':
      case 'hours':
        return 1000 * 60 * 60;
      case 'd':
      case 'ds':
      case 'day':
      case 'days':
        return 1000 * 60 * 60 * 24;
      case 'w':
      case 'wk':
      case 'wks':
      case 'week':
      case 'weeks':
        return 1000 * 60 * 60 * 24 * 7;
      default:
        return null;
    }
  },
  parse: function(s) {
    var match = this._regex.exec(s);
    if (match === null) {
      return null;
    }
    var unit = this._unit(match[4]);
    if (unit === null) {
      return null;
    }
    if (match[1] === undefined) {
      return unit;
    }
    return parseFloat(match[1]) * unit;
  },
  get: function(x) {
    if (typeOf(x) === 'string') {
      return this.parse(x);
    }
    return x;
  }
};
