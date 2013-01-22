'use strict';

var DataImportError = new Class({
  Extends: Error,
  initialize: function(msg) {
    this._msg = msg;
  },
  toString: function() {
    return 'DataImportError: ' + this._msg;
  }
});

var RowLoader = {
  load: function(data) {
    if (data.length === 0) {
      throw new DataImportError('empty data string');
    }
    var rows = d3.csv.parse(data);
    if (rows.length === 0) {
      throw new DataImportError('empty dataset');
    }
    // TODO: channel type marshalling
    return rows;
  }
};

var ChannelExtractor = {
  _getTimestamps: function(ts) {
    // Is it a timestamp? UNIX or JavaScript-style?
    var nowMs = +new Date();
    var isJS = ts.every(function(t) {
      var tf = parseFloat(t);
      return (
        !isNaN(tf) &&
        nowMs / 2 <= tf &&
        tf <= nowMs * 2
      );
    });
    if (isJS) {
      return ts.map(function(t) {
        return parseFloat(t);
      });
    }
    var nowS = nowMs / 1000;
    var isUNIX = ts.every(function(t) {
      var tf = parseFloat(t);
      return (
        !isNaN(tf) &&
        nowS / 2 <= tf &&
        tf <= nowS * 2
      );
    });
    if (isUNIX) {
      return ts.map(function(t) {
        return parseFloat(t) * 1000;
      });
    }

    // Is it Date-parseable?
    var hasTime = ts.every(function(t) {
      return t.indexOf(':') !== -1;
    });
    var tds = ts.map(function(t) {
      var d = new Date(t);
      if (!hasTime && d.getHours() !== 0) {
        var tzOffset = d.getTimezoneOffset() * 60 * 1000;
        return +d + tzOffset;
      }
      return +d;
    });
    var isDateParseable = tds.every(function(t) {
      return !isNaN(t);
    });
    if (isDateParseable) {
      return tds;
    }

    // TODO: deal with more
    throw new DataImportError('could not get timestamps!');
  },
  _getValue: function(x) {
    // kill thousands separators
    x = x.replace(/,/g, '');
    // kill currency symbols
    x = x.replace(/[$€£]/, '');
    return parseFloat(x);
  },
  _extractColumn: function(xcol, rows) {
    var data = [],
        lastT = null;
    for (var i = 0; i < rows.length; i++) {
      var x = rows[i][xcol];
      if (x === undefined || x.length === 0) {
        continue;
      }
      var t = rows[i]['__t'];
      if (t <= lastT) {
        t = lastT + 1;
      }
      data.push({t: t, x: this._getValue(x)});
      lastT = t;
    }
    return data;
  },
  extract: function(tcols, xcols, rows) {
    if (tcols.length === 0 || xcols.length === 0) {
      throw new DataImportError('missing timestamp or value columns');
    }
    var ts = rows.map(function(row) {
      return tcols.map(function(tcol) {
        return row[tcol];
      }).join(' ');
    });
    ts = this._getTimestamps(ts);
    rows.each(function(row, i) {
      row['__t'] = ts[i];
    });
    rows.sort(function(a, b) {
      return a['__t'] - b['__t'];
    });
    var channels = {};
    xcols.each(function(xcol) {
      channels[xcol] = this._extractColumn(xcol, rows);
    }.bind(this));
    return channels;
  }
};
