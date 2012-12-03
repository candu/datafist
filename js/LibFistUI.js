function _caption(sexp) {
  var s = SExp.unparse(sexp);
  if (s.length > 30) {
    s = s.substring(0, 27) + '...';
  }
  return s;
}

function _getBucketing(sexp) {
  if (SExp.isAtom(sexp)) {
    return null;
  }
  if (sexp[0] === '//*') {
    return parseFloat(sexp[2]);
  }
  for (var i = 1; i < sexp.length; i++) {
    var bucketing = _getBucketing(sexp[i]);
    if (bucketing) {
      return bucketing;
    }
  }
  return null;
}

function _format(x) {
  var e = d3.format('.8e')(x).replace(/0+e/, 'e').replace('.e', 'e');
      g = d3.format('.8g')(x);
  if (g.indexOf('.') !== -1) {
    g = g.replace(/0+$/, '').replace(/\.$/, '');
  }
  if (e.length < g.length) {
    return e;
  }
  return g;
}

function _stripFilters(sexp, filterName) {
  var cur = sexp;
  while (SExp.isList(cur) &&
         SExp.isList(cur[0]) &&
         cur[0][0] === filterName) {
    cur = cur[1];
  }
  return cur;
}

var SparklineView = {
  render: function(channels, view, sexps) {
    // TODO: verify that there's at least one channel

    var w = view.attr('width'),
        h = view.attr('height'),
        axisH = 20,
        axisW = 60;

    // extract data from channels
    var n = channels.length;
    var cds = [];
    for (var i = 0; i < n; i++) {
      cds.push([]);
      var it = channels[i].iter();
      while (true) {
        try {
          var t = it.next(),
              x = channels[i].at(t);
          cds[i].push({t: t, x: x});
        } catch (e) {
          if (!(e instanceof StopIteration)) {
            throw e;
          }
          break;
        }
      }
    }

    // get bounds
    var ctMin = d3.min(cds.map(function(cd) {
      return d3.min(cd, function(a) {
        return a.t;
      });
    }));
    var ctMax = d3.max(cds.map(function(cd) {
      return d3.max(cd, function(a) {
        return a.t;
      });
    }));
    if (ctMax === ctMin) {
      ctMin--;
      ctMax++;
    }

    var channelH = (h - axisH) / n,
        channelW = w - axisW;
    var ct = d3.scale.linear()
      .domain([ctMin, ctMax])
      .range([0, channelW]);

    // filter out sub-pixel time increments
    cds = cds.map(function(cd) {
      var lastT = -Infinity,
          filtered = [];
      for (var i = 0; i < cd.length; i++) {
        var curT = ct(cd[i].t);
        if (curT - lastT >= 1) {
          lastT = curT;
          filtered.push(cd[i]);
        }
      }
      return filtered;
    });

    // create w/h scales for all channels
    var cxs = cds.map(function(cd, i) {
      var cxMin = d3.min(cd, function(a) {
        return a.x;
      });
      var cxMax = d3.max(cd, function(a) {
        return a.x;
      });
      if (cxMax === cxMin) {
        cxMin--;
        cxMax++;
      }
      return d3.scale.linear()
        .domain([cxMin, cxMax])
        .range([channelH - axisH / 2, axisH / 2]);
    });

    // color scale!
    var cc = d3.scale.category10();

    // axes
    var scaleT = d3.time.scale()
      .domain([ctMin, ctMax])
      .range([0, channelW]);
    var axisT = d3.svg.axis()
      .scale(scaleT)
      .ticks(10)
      .tickSize(-channelH * n);
    view.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + axisW + ', ' + (channelH * n) + ')')
      .call(axisT);
    for (var i = 0; i < n; i++) {
      var axisX = d3.svg.axis()
        .scale(cxs[i])
        .orient('left')
        .ticks(5)
        .tickSize(-channelW);
      view.append('svg:g')
        .attr('class', 'channel axis')
        .attr('transform', 'translate(' + axisW + ', ' + (channelH * i) + ')')
        .call(axisX);
    }

    // sparklines
    for (var i = 0; i < n; i++) {
      var line = d3.svg.line()
        .x(function(d) { return ct(d.t); })
        .y(function(d) { return cxs[i](d.x); });
      var g = view.append('svg:g')
        .attr('transform', 'translate(' + axisW + ', ' + (channelH * i) + ')');
      g.append('svg:path')
          .attr('d', line(cds[i]))
          .attr('class', 'channel')
          .attr('stroke', cc(i));
      if (i > 0) {
        g.append('svg:line')
          .attr('class', 'channel-separator')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', channelW)
          .attr('y2', 0);
      }
      g.append('svg:text')
        .attr('class', 'channel caption')
        .attr('x', channelW - 8)
        .attr('y', 8)
        .attr('dy', '.71em')
        .attr('text-anchor', 'end')
        .text(_caption(sexps[i]));
    }

    // time-filtering hit area
    this._selectionStart = null;
    var dragBehavior = d3.behavior.drag()
      .on('dragstart', function(d) {
        var dragPos = $d3(this._dragGroup).getPosition(),
            x = d3.event.sourceEvent.pageX - dragPos.x;
        this._selectionStart = x;
        this._dragSelectionArea
          .attr('class', 'channel selection-area')
          .attr('x', this._selectionStart)
          .attr('y', 0)
          .attr('width', 0)
          .attr('height', channelH * n);
      }.bind(this))
      .on('drag', function(d) {
        var dragPos = $d3(this._dragGroup).getPosition(),
            x = d3.event.sourceEvent.pageX - dragPos.x;
        x = Math.max(0, Math.min(x, channelW));
        this._dragSelectionArea
          .attr('class', 'channel selection-area')
          .attr('x', Math.min(x, this._selectionStart))
          .attr('y', 0)
          .attr('width', Math.abs(x - this._selectionStart))
          .attr('height', channelH * n);
      }.bind(this));

    this._dragGroup = view.append('svg:g')
      .attr('transform', 'translate(' + axisW + ', 0)');
    this._dragHitArea = this._dragGroup.append('svg:rect')
      .attr('class', 'channel hit-area')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', channelW)
      .attr('height', channelH * n)
      .call(dragBehavior);
    this._dragSelectionArea = this._dragGroup.append('svg:rect')
      .attr('class', 'hidden')
      .on('click', function(d) {
        var x1 = parseFloat(this._dragSelectionArea.attr('x')),
            x2 = x1 + parseFloat(this._dragSelectionArea.attr('width')),
            t = Interval.nice([+(scaleT.invert(x1)), +(scaleT.invert(x2))]);
        var filteredSexp = sexps.map(function(sexp) {
          var sexpF = _stripFilters(sexp, 'between');
          return [['between', _format(t[0]), _format(t[1])], sexpF];
        }.bind(this));
        filteredSexp.unshift('view-sparkline');
        $d3(view).fireEvent('sexpreplaced', [filteredSexp]);
      }.bind(this));
  }
  // TODO: update height automatically on window resize?
};

var HistogramView = {
  render: function(channels, view, sexps) {
    var w = view.attr('width'),
        h = view.attr('height'),
        axisH = 20,
        axisW = 60;

    var data = [];
    var it = channels[0].iter();
    while (true) {
      try {
        var t = it.next(),
            x = channels[0].at(t);
        data.push(x);
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }

    data.sort();
    var hist = [],
        last = -1;
    for (var i = 0; i < data.length; i++) {
      if (last === -1 || data[i] !== hist[last].x) {
        hist.push({x: data[i], freq: 0});
        last++;
      }
      hist[last].freq++;
    }

    var xs = hist.map(function(p) { return p.x; }),
        xmin = d3.min(xs),
        xmax = d3.max(xs),
        freqs = hist.map(function(p) { return p.freq; });
    if (xmin === xmax) {
      xmin--;
      xmax++;
    }

    var histH = h - 2 * axisH,
        histW = w - 2 * axisW,
        bucketing = _getBucketing(sexps[0]);
    if (bucketing !== null) {
      var buckets = Math.round((xmax - xmin) / bucketing),
          bucketW = histW / (buckets + 1);
      if (bucketW < 3) {
        bucketing = null;
      } else {
        xmax += bucketing;
      }
    }
    var scaleX = d3.scale.linear()
      .domain([xmin, xmax])
      .range([0, histW]);
    var scaleFreq = d3.scale.linear()
      .domain([0, d3.max(freqs)])
      .range([histH, 0]);

    var cc = d3.scale.category10();

    // axes
    var axisX = d3.svg.axis()
      .scale(scaleX)
      .ticks(10)
      .tickSize(-histH);
    view.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + axisW + ', ' + (histH + axisH) + ')')
      .call(axisX);
    var axisFreq = d3.svg.axis()
      .scale(scaleFreq)
      .orient('left')
      .ticks(10)
      .tickSize(-histW);
    view.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + axisW + ', ' + axisH + ')')
      .call(axisFreq);


    // histogram
    var g = view.append('svg:g')
      .attr('transform', 'translate(' + axisW + ', ' + axisH + ')');
    if (bucketing === null) {
      g.selectAll('line')
        .data(hist)
        .enter().append('svg:line')
          .attr('x1', function(d) { return scaleX(d.x); })
          .attr('y1', function(d) { return scaleFreq(d.freq); })
          .attr('x2', function(d) { return scaleX(d.x); })
          .attr('y2', histH)
          .attr('opacity', 0.3)
          .attr('stroke', cc(0))
          .attr('stroke-width', 2);
    } else {
      g.selectAll('rect')
        .data(hist)
        .enter().append('svg:rect')
          .attr('x', function(d) { return scaleX(d.x) + 1; })
          .attr('y', function(d) { return scaleFreq(d.freq); })
          .attr('width', bucketW - 2)
          .attr('height', function(d) { return histH - scaleFreq(d.freq); })
          .attr('fill', cc(0));
    }
    g.append('svg:text')
      .attr('class', 'histogram caption')
      .attr('x', histW - 8)
      .attr('y', 8)
      .attr('text-anchor', 'end')
      .text(_caption(sexps[0]));

    // value-filtering hit area
    // TODO: merge this with time-filtering code from SparklineView
    this._selectionStart = null;
    var dragBehavior = d3.behavior.drag()
      .on('dragstart', function(d) {
        var dragPos = $d3(this._dragGroup).getPosition(),
            x = d3.event.sourceEvent.pageX - dragPos.x;
        this._selectionStart = x;
        this._dragSelectionArea
          .attr('class', 'histogram selection-area')
          .attr('x', this._selectionStart)
          .attr('y', 0)
          .attr('width', 0)
          .attr('height', histH);
      }.bind(this))
      .on('drag', function(d) {
        var dragPos = $d3(this._dragGroup).getPosition(),
            x = d3.event.sourceEvent.pageX - dragPos.x;
        x = Math.max(0, Math.min(x, histW));
        this._dragSelectionArea
          .attr('class', 'histogram selection-area')
          .attr('x', Math.min(x, this._selectionStart))
          .attr('y', 0)
          .attr('width', Math.abs(x - this._selectionStart))
          .attr('height', histH);
      }.bind(this));

    this._dragGroup = view.append('svg:g')
      .attr('transform', 'translate(' + axisW + ', ' + axisH + ')');
    this._dragHitArea = this._dragGroup.append('svg:rect')
      .attr('class', 'histogram hit-area')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', histW)
      .attr('height', histH)
      .call(dragBehavior);
    this._dragSelectionArea = this._dragGroup.append('svg:rect')
      .attr('class', 'hidden')
      .on('click', function(d) {
        var x1 = parseFloat(this._dragSelectionArea.attr('x')),
            x2 = x1 + parseFloat(this._dragSelectionArea.attr('width')),
            x = Interval.nice([+(scaleX.invert(x1)), +(scaleX.invert(x2))]),
            sexpX = _stripFilters(sexps[0], 'value-between');
        var filteredSexp = [
          'view-histogram',
          [['value-between', _format(x[0]), _format(x[1])], sexpX]
        ];
        $d3(view).fireEvent('sexpreplaced', [filteredSexp]);
      }.bind(this));
  }
};

var RegressionView = {
  render: function(channels, view, sexps) {
    var w = view.attr('width'),
        h = view.attr('height'),
        axisH = 20,
        axisW = 60;

    // extract data from channels
    var data = [];
    var it = IntersectionIterator([channels[0].iter(), channels[1].iter()]);
    while (true) {
      try {
        var t = it.next(),
            x = channels[0].at(t),
            y = channels[1].at(t);
        data.push({x: x, y: y});
      } catch(e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }

    // get bounds
    var xs = data.map(function(p) { return p.x; }),
        xmin = d3.min(xs),
        xmax = d3.max(xs),
        ys = data.map(function(p) { return p.y; }),
        ymin = d3.min(ys),
        ymax = d3.max(ys);
    if (xmin === xmax) {
      xmin--;
      xmax++;
    }
    if (ymin === ymax) {
      ymin--;
      ymax++;
    }

    // create scales
    var plotH = h - 2 * axisH,
        plotW = w - 2 * axisW;
    var scaleX = d3.scale.linear()
      .domain([xmin, xmax])
      .range([0, plotW]);
    var scaleY = d3.scale.linear()
      .domain([ymin, ymax])
      .range([plotH, 0]);

    // color scale!
    var cc = d3.scale.category10();

    // axes
    var axisX = d3.svg.axis()
      .scale(scaleX)
      .ticks(10)
      .tickSize(-plotH);
    view.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + axisW + ', ' + (plotH + axisH) + ')')
      .call(axisX);
    var axisY = d3.svg.axis()
      .scale(scaleY)
      .orient('left')
      .ticks(10)
      .tickSize(-plotW);
    view.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + axisW + ', ' + axisH + ')')
      .call(axisY);

    // plot
    var g = view.append('svg:g')
      .attr('transform', 'translate(' + axisW + ', ' + axisH + ')');
    g.selectAll('circle')
      .data(data)
      .enter().append('svg:circle')
        .attr('cx', function (d) { return scaleX(d.x); })
        .attr('cy', function (d) { return scaleY(d.y); })
        .attr('r', 4)
        .attr('fill', cc(0));
    g.append('svg:text')
      .attr('class', 'regression caption')
      .attr('x', plotW - 8)
      .attr('y', plotH - 8)
      .attr('text-anchor', 'end')
      .text(_caption(sexps[0]));
    g.append('svg:text')
      .attr('class', 'regression caption')
      .attr('x', 8)
      .attr('y', 8)
      .attr('dy', '.71em')
      .text(_caption(sexps[1]));

    // region-filtering hit area
    // TODO: merge this with time-filtering code from SparklineView
    this._selectionStart = null;
    var dragBehavior = d3.behavior.drag()
      .on('dragstart', function(d) {
        var dragPos = $d3(this._dragGroup).getPosition(),
            x = d3.event.sourceEvent.pageX - dragPos.x,
            y = d3.event.sourceEvent.pageY - dragPos.y;
        this._selectionStart = {x: x, y: y};
        this._dragSelectionArea
          .attr('class', 'regression selection-area')
          .attr('x', this._selectionStart.x)
          .attr('y', this._selectionStart.y)
          .attr('width', 0)
          .attr('height', 0);
      }.bind(this))
      .on('drag', function(d) {
        var dragPos = $d3(this._dragGroup).getPosition(),
            x = d3.event.sourceEvent.pageX - dragPos.x,
            y = d3.event.sourceEvent.pageY - dragPos.y;
        x = Math.max(0, Math.min(x, plotW));
        y = Math.max(0, Math.min(y, plotH));
        this._dragSelectionArea
          .attr('class', 'regression selection-area')
          .attr('x', Math.min(x, this._selectionStart.x))
          .attr('y', Math.min(y, this._selectionStart.y))
          .attr('width', Math.abs(x - this._selectionStart.x))
          .attr('height', Math.abs(y - this._selectionStart.y));
      }.bind(this));

    this._dragGroup = view.append('svg:g')
      .attr('transform', 'translate(' + axisW + ', ' + axisH + ')');
    this._dragHitArea = this._dragGroup.append('svg:rect')
      .attr('class', 'regression hit-area')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', plotW)
      .attr('height', plotH)
      .call(dragBehavior);
    this._dragSelectionArea = this._dragGroup.append('svg:rect')
      .attr('class', 'hidden')
      .on('click', function(d) {
        var x1 = parseFloat(this._dragSelectionArea.attr('x')),
            x2 = x1 + parseFloat(this._dragSelectionArea.attr('width')),
            x = Interval.nice([+(scaleX.invert(x1)), +(scaleX.invert(x2))]),
            y1 = parseFloat(this._dragSelectionArea.attr('y')),
            y2 = y1 + parseFloat(this._dragSelectionArea.attr('height'))
            y = Interval.nice([+(scaleY.invert(y2)), +(scaleY.invert(y1))]),
            sexpX = _stripFilters(sexps[0], 'value-between'),
            sexpY = _stripFilters(sexps[1], 'value-between');
        var filteredSexp = [
          'view-regression',
          [['value-between', _format(x[0]), _format(x[1])], sexpX],
          [['value-between', _format(y[0]), _format(y[1])], sexpY]
        ]
        $d3(view).fireEvent('sexpreplaced', [filteredSexp]);
      }.bind(this));
  }
};

var LibFistUI = {
  import: function(fistUI) {
    fistUI.importView('sparkline', SparklineView);
    fistUI.importView('histogram', HistogramView);
    fistUI.importView('regression', RegressionView);
  }
};
