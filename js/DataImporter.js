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
        if (_startCallback !== null) {
          _startCallback(file);
        }
      };
      reader.onprogress = function(evt) {
        var progress = null;
        if (evt.lengthComputable) {
          progress = evt.loaded / evt.total;
        }
        if (_progressCallback !== null) {
          _progressCallback(file, progress);
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
