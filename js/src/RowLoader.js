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
