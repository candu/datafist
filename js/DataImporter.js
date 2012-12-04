var DataImportError = new Class({
  Extends: Error,
  initialize: function(msg) {
    this._msg = msg;
  },
  toString: function() {
    return 'DataImportError: ' + this._msg;
  }
});

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