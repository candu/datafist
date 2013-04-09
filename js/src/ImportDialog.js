var ImportDialog = new Class({
  MAX_FILE_SIZE: 100 * 1024 * 1024,   // 100 MB
  INITIAL_CHUNK_READ: 4 * 1024,       // 4 KB
  initialize: function(root, status) {
    this._root = root;
    this._status = status;

    this._file = null;
    this._currentStep = null;
    this._lines = null;
    this._picked = null;
    this._columns = null;
    this._timeColumns = null;
    this._valueColumns = null;
    this._fullFileReader = null;

    this._backButton = this._root.getElement('#back');
    this._backButton.addEvent('click', this._back.bind(this));
    this._nextButton = this._root.getElement('#next');
    this._nextButton.addEvent('click', this._next.bind(this));
    this._cancelButton = this._root.getElement('#cancel');
    this._cancelButton.addEvent('click', this._cancel.bind(this));
  },
  _step: function(i) {
    this._currentStep = i;
    this._root.getElements('.step').addClass('hidden');
    switch (this._currentStep) {
      case 1:
        this._root.getElement('#step1').removeClass('hidden');
        this._backButton.addClass('disabled');
        this._nextButton.set('value', 'next').removeClass('disabled');
        break;
      case 2:
        this._root.getElement('#step2').removeClass('hidden');
        this._backButton.removeClass('disabled');
        this._nextButton.set('value', 'next').addClass('disabled');
        break;
      case 3:
        this._root.getElement('#step3').removeClass('hidden');
        this._backButton.removeClass('disabled');
        this._nextButton.set('value', 'import').addClass('disabled');
        break;
      case 4:
        this._root.getElement('#step3').removeClass('hidden');
        this._backButton.addClass('disabled');
        this._nextButton.addClass('disabled');
        break;
      default:
    }
  },
  _step0: function(file) {
    this._step(0);
    this._file = file;
    if (this._file.size > this.MAX_FILE_SIZE) {
      this._error('file too large!');
    }
    var reader = new FileReader();
    reader.onloadstart = function(evt) {
      if (!evt.lengthComputable) {
        this._error('could not compute file length!');
        return;
      }
    }.bind(this);
    reader.onloadend = function(evt) {
      if (evt.target.readyState !== FileReader.DONE) {
        this._error('failed to load file!');
        return;
      }
      if (this._currentStep !== 0) {
        return;
      }
      this._step1(evt.target.result);
    }.bind(this);
    var blob = this._file.slice(0, this.INITIAL_CHUNK_READ);
    reader.readAsText(blob);
  },
  _pickLines: function(lineData) {
    var rows = d3.csv.parseRows(lineData);
    var maxL = d3.max(rows, function(row) { return row.length; }),
        Ls = [];
    for (var i = 0; i <= maxL; i++) {
      Ls.push([]);
    }
    rows.each(function(row, i) {
      Ls[row.length].push(i);
    });
    var maxi = 0;
    for (var i = 1; i <= maxL; i++) {
      if (Ls[i].length > Ls[maxi].length) {
        maxi = i;
      }
    }
    return {
      selected: Ls[maxi][0],
      limit: Ls[maxi][0] + 10
    };
  },
  _getSepLast: function(partialFileData) {
    var sep = '\n',
        last = partialFileData.lastIndexOf(sep);
    if (last === -1) {
      sep = '\r';
      last = partialFileData.lastIndexOf(sep);
    }
    return {
      sep: sep,
      last: last
    };
  },
  _step1: function(partialFileData) {
    this._step(1);
    var sepLast = this._getSepLast(partialFileData),
        lineData = partialFileData.substring(0, sepLast.last),
        picked = this._pickLines(lineData),
        lines = lineData.split(sepLast.sep),
        stepRoot = this._root.getElement('#step1'),
        table = stepRoot.getElement('.table');
    this._lines = lines;
    this._picked = picked;
    var buildLine = function(i, selected) {
      var line = this._lines[i],
          lineNumber = i + 1;
      var rowElem = new Element('div.data-row');
      var cell = new Element('div.data-cell')
        .setStyle('width', '99%')
        .toggleClass('odd', lineNumber % 2 === 1)
        .toggleClass('selected', i === selected)
        .addEvent('click', function(evt) {
          table.getElements('.data-cell').removeClass('selected');
          cell.addClass('selected');
          this._picked = {selected: i, limit: i + 10};
        }.bind(this));
      var text = new Element('div', {
        text: line
      });
      cell.adopt(text);
      rowElem.adopt(cell);
      return rowElem;
    }.bind(this);
    table.empty();
    for (var i = 0; i < this._picked.limit; i++) {
      table.adopt(buildLine(i, this._picked.selected));
    }
    this._root.addClass('active');
  },
  _step2: function() {
    this._step(2);
    var lines = this._lines.slice(this._picked.selected, this._picked.limit),
        rows = lines.map(function(line) {
          return d3.csv.parseRows(line)[0];
        }),
        stepRoot = this._root.getElement('#step2'),
        table = stepRoot.getElement('.table');
    this._columns = rows[0];
    this._timeColumns = new Array(this._columns.length);
    table.setStyle('width', (100 + 2 * 2) * this._columns.length)
    var buildRow = function(row) {
      var rowElem = new Element('div.data-row');
      row.each(function(col, i) {
        var cell = new Element('div.data-cell')
          .set('text', col)
          .setStyle('width', 100)
          .addClass('col_' + i)
          .toggleClass('odd', i % 2 === 1);
        cell.addEvent('click', function(evt) {
          table.getElements('.col_' + i).toggleClass('selected');
          if (this._timeColumns[i] === undefined) {
            this._timeColumns[i] = true;
            this._nextButton.removeClass('disabled');
          } else {
            this._timeColumns[i] = undefined;
            var tcols = this._getColumns(this._timeColumns);
            if (tcols.length === 0) {
              this._nextButton.addClass('disabled');
            }
          }
          console.log(JSON.stringify(this._timeColumns));
        }.bind(this));
        rowElem.adopt(cell);
      }.bind(this));
      return rowElem;
    }.bind(this);
    table.empty();
    for (var i = 0; i < rows.length; i++) {
      table.adopt(buildRow(rows[i]));
    }
  },
  _step3: function() {
    this._step(3);
    var lines = this._lines.slice(this._picked.selected, this._picked.limit),
        rows = lines.map(function(line) {
          return d3.csv.parseRows(line)[0];
        }),
        stepRoot = this._root.getElement('#step3'),
        table = stepRoot.getElement('.table');
    this._valueColumns = new Array(this._columns.length);
    table.setStyle('width', (100 + 2 * 2) * this._columns.length)
    var buildRow = function(row) {
      var rowElem = new Element('div.data-row');
      row.each(function(col, i) {
        var cell = new Element('div.data-cell')
          .setStyle('width', 100)
          .addClass('col_' + i)
          .toggleClass('odd', i % 2 === 1);
        if (this._timeColumns[i] === true) {
          cell.addClass('unselectable');
        } else {
          cell.addEvent('click', function(evt) {
            table.getElements('.col_' + i).toggleClass('selected');
            if (this._valueColumns[i] === undefined) {
              this._valueColumns[i] = true;
              this._nextButton.removeClass('disabled');
            } else {
              this._valueColumns[i] = undefined;
              var xcols = this._getColumns(this._valueColumns);
              if (xcols.length === 0) {
                this._nextButton.addClass('disabled');
              }
            }
            console.log(JSON.stringify(this._timeColumns));
          }.bind(this));
        }
        var text = new Element('div', {
          text: col
        });
        cell.adopt(text);
        rowElem.adopt(cell);
      }.bind(this));
      return rowElem;
    }.bind(this);
    table.empty();
    for (var i = 0; i < rows.length; i++) {
      table.adopt(buildRow(rows[i]));
    }
  },
  _getColumns: function(selection) {
    return this._columns.filter(function(x, i) {
      return selection[i];
    });
  },
  _importData: function(data) {
    var tcols = this._getColumns(this._timeColumns),
        xcols = this._getColumns(this._valueColumns),
        rows = RowLoader.load(data),
        channels = ChannelExtractor.extract(tcols, xcols, rows);
    Object.each(channels, function(channelData, suffix) {
      var fileName = this._file.name,
          prefix = fileName.substring(0, fileName.lastIndexOf('.')),
          lowerSuffix = suffix.toLowerCase().replace(' ', '-'),
          name = prefix + '-' + lowerSuffix;
      Fist.importData(name, channelData, fileName);
    }.bind(this));
  },
  _step4: function() {
    this._step(4);
    var progress = this._root.getElement('#progress');
    this._fullFileReader = new FileReader();
    this._fullFileReader.onloadstart = function(evt) {
      progress.set('value', 0).set('max', evt.total);
    };
    this._fullFileReader.onprogress = function(evt) {
      progress.set('value', evt.loaded);
    };
    this._fullFileReader.onloadend = function(evt) {
      if (evt.target.readyState !== FileReader.DONE) {
        this._error('failed to load file!');
      }
      try {
        this._importData(evt.target.result);
      } catch (e) {
        if (!(e instanceof DataImportError)) {
          throw e;
        }
        this._error(e.toString());
        return;
      }
      this._finish();
    }.bind(this);
    this._fullFileReader.readAsText(this._file);
  },
  _back: function() {
    switch (this._currentStep) {
      case 2:
      case 3:
        this._step(this._currentStep - 1);
        break;
      default:
        var msg = 'invalid step for _back(): ' + this._currentStep;
        this._error(msg);
    }
  },
  _next: function(args) {
    // TODO: validation!
    switch (this._currentStep) {
      case 1:
        this._step2();
        break;
      case 2:
        var tcols = this._getColumns(this._timeColumns);
        if (tcols.length === 0) {
          return;
        }
        this._step3();
        break;
      case 3:
        var xcols = this._getColumns(this._timeColumns);
        if (xcols.length === 0) {
          return;
        }
        this._step4();
        break;
      default:
        var msg = 'invalid step for _next(): ' + this._currentStep;
        this._error(msg);
    }
  },
  _reset: function() {
    this._file = null;
    this._currentStep = null;
    this._lines = null;
    if (this._fullFileReader !== null) {
      this._fullFileReader.abort();
    }
    this._picked = null;
    this._columns = null;
    this._timeColumns = null;
    this._valueColumns = null;
    this._fullFileReader = null;
  },
  _error: function(msg) {
    this._reset();
    this._status.notOK('import failed! ' + msg);
    this._root.removeClass('active');
  },
  _cancel: function() {
    this._reset();
    this._status.notOK('import cancelled.');
    this._root.removeClass('active');
  },
  _finish: function() {
    this._reset();
    this._status.OK('import successful.');
    this._root.removeClass('active');
  },
  show: function(file) {
    this._step0(file);
  }
});
