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
    rows = d3.csv.parse(data);
    if (rows.length === 0) {
      throw new DataImportError('empty dataset');
    }
    // TODO: channel type marshalling
    return rows;
  }
};

var ChannelExtractor = {
  _validate: function(spec, rows) {
    var sexp;
    try {
      sexp = SExp.parse(spec);
    } catch (e) {
      throw new DataImportError('invalid spec: SExp.parse() failed');
    }
    if (SExp.isAtom(sexp)) {
      throw new DataImportError('invalid spec: not a list');
    }
    if (sexp.length !== 2) {
      throw new DataImportError('invalid spec: expected (tcols xcols)');
    }
    var tcols = sexp[0],
        xcols = sexp[1];
    if (!SExp.isList(tcols) || tcols.length > 2) {
      throw new DataImportError('invalid spec: expected (date [time])');
    }
    if (!SExp.isList(xcols)) {
      throw new DataImportError('invalid spec: expected (col1 ... colN)');
    }
    for (var i = 0; i < tcols.length; i++) {
      if (/"(.*)"/.test(tcols[i])) {
        tcols[i] = tcols[i].replace(/"(.*)"/, '$1').replace(/\\"/g, '"');
      }
      if (rows[0][tcols[i]] === undefined) {
        throw new DataImportError('invalid spec: unknown column ' + tcols[i]);
      }
    }
    for (var i = 0; i < xcols.length; i++) {
      if (/"(.*)"/.test(xcols[i])) {
        xcols[i] = xcols[i].replace(/"(.*)"/, '$1').replace(/\\"/g, '"');
      }
      if (rows[0][xcols[i]] === undefined) {
        throw new DataImportError('invalid spec: unknown column ' + xcols[i]);
      }
    }
    return {t: tcols, x: xcols};
  },
  extract: function(spec, rows) {
    var cols = this._validate(spec, rows);
    return [];
  }
};

function FileImporter(file) {
  var _startCallback = null,
      _progressCallback = null,
      _loadCallback = null;
  return {
    start: function(callback) {
      _startCallback = callback;
      return this;
    },
    progress: function(callback) {
      _progressCallback = callback;
      return this;
    },
    load: function(callback) {
      _loadCallback = callback;
      return this;
    },
    import: function() {
      var MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB
      if (file.size > MAX_FILE_SIZE) {
        throw new DataImportError('file too large');
      }
      var reader = new FileReader();
      reader.onloadstart = function(evt) {
        var total = null;
        if (evt.lengthComputable) {
          total = evt.total;
        }
        if (_startCallback !== null) {
          _startCallback(file, total);
        }
      };
      reader.onprogress = function(evt) {
        var loaded = null;
        if (evt.lengthComputable) {
          loaded = evt.loaded;
        }
        if (_progressCallback !== null) {
          _progressCallback(file, loaded);
        }
      };
      reader.onload = function(evt) {
        if (_loadCallback !== null) {
          _loadCallback(file, evt.target.result);
        }
      };
      reader.readAsText(file);
    }
  }
}
