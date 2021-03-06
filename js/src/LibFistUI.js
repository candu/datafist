function _numTicks(px) {
  return Math.max(3, Math.min(7, Math.floor(px / 100)));
}

function _caption(code) {
  var caption = code.op;
  if (Fist.isAtom(code)) {
    return caption;
  }
  var argParts = [];
  Object.each(code.args, function(arg, name) {
    var argCaption;
    if (arg instanceof Array) {
      argCaption = '[' + arg.map(function(subArg) {
        return _caption(subArg);
      }).join(', ') + ']';
    } else {
      argCaption = _caption(arg);
    }
    argParts.push(name + ': ' + argCaption);
  });
  caption += '(' + argParts.join(', ') + ')';
  return caption;
}

function _getBucketing(code) {
  if (Fist.isAtom(code)) {
    return undefined;
  }
  switch (code.op) {
    case '//*':
      return Fist.evaluateAtom(code.args.b);
    case 'hour-of-day':
    case 'day-of-week':
    case 'month-of-year':
      return 1;
    default:
      var bucket = undefined;
      Object.each(code.args, function(arg) {
        bucket = _getBucketing(arg);
        if (bucket !== undefined) {
          return false;
        }
      });
      return bucket;
  }
}

function _format(x) {
  var e = d3.format('.8e')(x).replace(/0+e/, 'e').replace('.e', 'e'),
      g = d3.format('.8g')(x);
  if (g.indexOf('.') !== -1) {
    g = g.replace(/0+$/, '').replace(/\.$/, '');
  }
  if (e.length < g.length) {
    g = e;
  }
  g = g.replace('\u2212', '-');
  return g;
}

function _stripFilters(code, filterName) {
  var cur = code;
  while (Fist.isFunction(cur) && cur.op === filterName) {
    cur = cur.args.c;
  }
  return cur;
}

function _getFiltering(code, filterName) {
  if (code.op !== filterName) {
    return undefined;
  }
  switch (filterName) {
    case 'value-between':
      return {
        min: parseFloat(code.args.x1),
        max: parseFloat(code.args.x2)
      };
    case 'time-between':
      return {
        min: parseFloat(code.args.since),
        max: parseFloat(code.args.until)
      };
    default:
      return undefined;
  }
}

function _getBound(data, key) {
  return {
    min: d3.min(data, function(d) { return d[key]; }),
    max: d3.max(data, function(d) { return d[key]; })
  };
}

function _fixBound(bound) {
  if (!isFinite(bound.min) || !isFinite(bound.max)) {
    bound.min = 0;
    bound.max = 0;
  }
  if (bound.min === bound.max) {
    bound.min--;
    bound.max++;
  }
}

var ViewUtils = {
  getProjection: function(data, scale, key) {
    var proj = {};
    data.each(function(d) {
      var p = Math.floor(scale(d[key]));
      if (proj[p] === undefined) {
        proj[p] = 0;
      }
      proj[p]++;
    });
    return proj;
  },
  drawVerticalProjectionTicks: function(proj, axis) {
    var max = d3.max(Object.values(proj)),
        scale = d3.scale.log().domain([1, max]).range([0.2, 1]);
    var group = axis.append('svg:g')
      .attr('class', 'projection');
    Object.each(proj, function(k, p) {
      group.append('svg:line')
        .attr('x1', 2)
        .attr('y1', p)
        .attr('x2', 8)
        .attr('y2', p)
        .style('opacity', scale(k));
    });
  },
  drawHorizontalProjectionTicks: function(proj, axis) {
    var max = d3.max(Object.values(proj)),
        scale = d3.scale.log().domain([1, max]).range([0.2, 1]);
    var group = axis.append('svg:g')
      .attr('class', 'projection');
    Object.each(proj, function(k, p) {
      group.append('svg:line')
        .attr('x1', p)
        .attr('y1', -2)
        .attr('x2', p)
        .attr('y2', -8)
        .style('opacity', scale(k));
    });
  }
};

var LineView = {
  _bisect: d3.bisector(function(d) { return d.t; }).right,
  _getPointAt: function(cd, t) {
    t = +t;
    if (t < cd[0].t) {
      return cd[0];
    }
    if (t >= cd[cd.length - 1].t) {
      return cd[cd.length - 1];
    }
    var j = this._bisect(cd, t);
    var w = (t - cd[j - 1].t) / (cd[j].t - cd[j - 1].t),
        x = (1 - w) * cd[j - 1].x + w * cd[j].x;
    return {t: t, x: x};
  },
  render: function(view, args) {
    // TODO: verify that there's at least one channel

    var w = view.attr('width'),
        h = view.attr('height'),
        axisH = 20,
        axisW = 60,
        channels = args.channels,
        codes = args.__code.channels;

    // extract data from channels
    var n = channels.length,
        cds = [],
        tbound = {min: Infinity, max: -Infinity},
        xbounds = [];
    for (var i = 0; i < n; i++) {
      cds.push([]);
      var filtering = _getFiltering(codes[i], 'time-between');
      if (filtering !== undefined) {
        tbound.min = Math.min(filtering.min, tbound.min);
        tbound.max = Math.max(filtering.max, tbound.max);
      }
      var xbound = {min: Infinity, max: -Infinity};
      var it = channels[i].iter();
      while (true) {
        try {
          var t = it.next(),
              x = channels[i].at(t);
          cds[i].push({t: t, x: x});
          tbound.min = Math.min(t, tbound.min);
          tbound.max = Math.max(t, tbound.max);
          xbound.min = Math.min(x, xbound.min);
          xbound.max = Math.max(x, xbound.max);
        } catch (e) {
          if (!(e instanceof StopIteration)) {
            throw e;
          }
          break;
        }
      }
      _fixBound(xbound);
      xbounds.push(xbound);
    }
    _fixBound(tbound);

    var channelH = (h - axisH) / n,
        channelW = w - axisW;
    var ct = d3.time.scale()
      .domain([tbound.min, tbound.max])
      .range([0, channelW]);
    AutoNice.time(ct);

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

    var cxs = cds.map(function(cd, i) {
      return d3.scale.linear()
        .domain([xbounds[i].min, xbounds[i].max])
        .nice()
        .range([channelH - axisH / 2, axisH / 2]);
    });

    // color scale!
    var cc = d3.scale.category10();

    // axes
    var axisT = d3.svg.axis()
      .scale(ct)
      .ticks(_numTicks(channelW))
      .tickSize(0);
    view.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + axisW + ', ' + (channelH * n) + ')')
      .call(axisT);
    for (var i = 0; i < n; i++) {
      var scaleX = cxs[i];
      var axisX = d3.svg.axis()
        .scale(scaleX)
        .orient('left')
        .ticks(_numTicks(channelH))
        .tickSize(0);
      var axisGroupX = view.append('svg:g')
        .attr('class', 'channel axis')
        .attr('transform', 'translate(' + axisW + ', ' + (channelH * i) + ')')
        .call(axisX);
      axisGroupX.append('svg:line')
        .attr('class', 'range')
        .attr('x1', 0)
        .attr('y1', scaleX(xbounds[i].min))
        .attr('x2', 0)
        .attr('y2', scaleX(xbounds[i].max));

      // projection ticks
      var projX = ViewUtils.getProjection(cds[i], cxs[i], 'x');
      ViewUtils.drawVerticalProjectionTicks(projX, axisGroupX);
    }

    // lines
    this._tGuide = view.append('svg:line')
      .attr('class', 'channel guide')
      .attr('y1', 0)
      .attr('y2', channelH * i);
    this._xGuides = [];
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
        .attr('x', 8)
        .attr('y', 8)
        .attr('dy', '.71em')
        .attr('text-anchor', 'start')
        .text(_caption(codes[i]));
      this._xGuides.push(g.append('svg:line')
        .attr('class', 'channel guide')
        .attr('x1', 0)
        .attr('x2', channelW)
        .style('stroke', cc(i))
      );
    }

    // interaction area
    this._interactGroup = view.append('svg:g')
      .attr('transform', 'translate(' + axisW + ', 0)');
    this._interactHitArea = this._interactGroup.append('svg:rect')
      .attr('class', 'channel hit-area')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', channelW)
      .attr('height', channelH * n)
      .on('mousemove', function() {
        var mousePos = $d3(this._interactGroup).getPosition(),
            tpx = d3.event.pageX - mousePos.x,
            t = ct.invert(tpx);
        this._tGuide
          .attr('x1', tpx + axisW)
          .attr('x2', tpx + axisW);
        cds.each(function(cd, i) {
          var d = this._getPointAt(cd, t),
              y = cxs[i](d.x);
          this._xGuides[i]
            .attr('y1', y)
            .attr('y2', y);
        }.bind(this));
      }.bind(this))
      .on('mouseout', function() {
        this._tGuide.classed('hidden', true);
        this._xGuides.each(function(xGuide) {
          xGuide.classed('hidden', true);
        });
      }.bind(this))
      .on('mouseover', function() {
        this._tGuide.classed('hidden', false);
        this._xGuides.each(function(xGuide) {
          xGuide.classed('hidden', false);
        });
      }.bind(this));
  }
};

var CrossfilterView = {
  _BUCKETS: 20,
  _PADDING: 10,
  _colorScale: d3.scale.category10(),
  _determineGrid: function(w, h, n) {
    var ratio = w / h,
        cols = 0,
        rows = 0;
    do {
      cols++;
      rows = Math.floor(cols / ratio);
    } while (cols * rows < n);
    rows = Math.ceil(n / cols);
    var size = Math.ceil(w / cols);
    var offset = {
      x: 0,
      y: Math.floor((h - size * rows) / 2)
    };
    if (rows === 1) {
      offset.x = Math.floor((w - size * n) / 2);
    }
    return {
      cols: cols,
      rows: rows,
      size: size,
      offset: offset
    };
  },
  _makeCategoricalBarChart: function(view, filter, data, grid, code, charts) {
    var i = charts.length,
        _dim = filter.dimension(function(d) { return d[i]; }),
        _group = _dim.group(),
        _order = _group.top(Infinity),
        _cats = _order.map(function(d) { return d.key; });

    var _col = i % grid.cols,
        _row = (i - _col) / grid.cols,
        _gx = _col * grid.size + grid.offset.x + this._PADDING,
        _gy = _row * grid.size + grid.offset.y + this._PADDING,
        _size = grid.size - 2 * this._PADDING;
    var _scaleC = d3.scale.ordinal()
      .domain(_cats)
      .rangeBands([0, _cats.length]);
    var _scaleX = d3.scale.linear()
      .domain([0, _cats.length])
      .range([0, _size]);
    var _scaleY = d3.scale.linear()
      .domain([0, _order[0].value])
      .range([_size, 0]);

    var _g = view.append('svg:g')
      .attr('transform', 'translate(' + _gx + ', ' + _gy + ')');

    var _selected = null;
    var _paths = _g.selectAll('.crossfilter.bar')
      .data(_group.all(), function(d) { return d.key; })
      .enter().append('path')
        .attr('class', 'crossfilter bar category')
        .style('fill', this._colorScale(i))
        .on('click', function(d) {
          if (d.key === _selected) {
            d3.select(this)
              .attr('class', 'crossfilter bar category');
            _selected = null;
            _dim.filterAll();
          } else {
            _g.selectAll('.crossfilter.bar')
              .attr('class', 'crossfilter bar category');
            d3.select(this)
              .attr('class', 'crossfilter bar category selected');
            _selected = d.key;
            _dim.filterExact(_selected);
          }
          charts.each(function(chart) {
            chart.draw();
          });
        });

    var _scaleAxis = d3.scale.ordinal()
      .domain(_cats)
      .rangeBands([0, _size]);
    var _axis = d3.svg.axis()
      .scale(_scaleAxis)
      .tickSize(0);
    _g.append('svg:g')
      .attr('class', 'crossfilter category axis')
      .attr('transform', 'translate(0, ' + _size + ')')
      .call(_axis)
      .selectAll('text').each(function(d) {
        var parent = this.getParent(),
            transform = parent.get('transform');
        parent.set('transform', transform + 'rotate(-90)');
        d3.select(this)
          .attr('x', 10)
          .attr('y', -4)
          .attr('text-anchor', 'start')
      });

    _g.append('svg:text')
      .attr('class', 'crossfilter caption')
      .attr('x', 8)
      .attr('y', 8)
      .attr('dy', '.71em')
      .attr('text-anchor', 'start')
      .text(_caption(code));

    function draw() {
      _g.selectAll('.crossfilter.bar')
        .data(_group.all(), function(d) { return d.key; })
        .attr('d', function(d) {
          var ci = _scaleC(d.key);
          var path = [
            'M', Math.floor(_scaleX(ci)) + 0.5, ',', _size,
            'V', Math.floor(_scaleY(d.value)) + 0.5,
            'H', Math.floor(_scaleX(ci + 1)) - 0.5,
            'V', _size
          ];
          return path.join('');
        });
    }

    charts.push({
      draw: draw
    });
  },
  _makeNumericBarChart: function(view, filter, data, grid, code, charts) {
    var i = charts.length;
    var _bound = {
      min: d3.min(data, function(d) { return d[i]; }),
      max: d3.max(data, function(d) { return d[i]; })
    };
    var _dim = filter.dimension(function(d) { return d[i]; });
    var _group = _dim.group(function(x) {
      var bw = (_bound.max - _bound.min) / this._BUCKETS,
          b = Math.floor((x - _bound.min) / bw);
      return Math.min(b, this._BUCKETS - 1);
    }.bind(this));

    var _col = i % grid.cols,
        _row = (i - _col) / grid.cols,
        _gx = _col * grid.size + grid.offset.x + this._PADDING,
        _gy = _row * grid.size + grid.offset.y + this._PADDING,
        _size = grid.size - 2 * this._PADDING;
    var _scaleX = d3.scale.linear()
      .domain([0, this._BUCKETS])
      .range([0, _size]);
    var _scaleY = d3.scale.linear()
      .domain([0, _group.top(1)[0].value])
      .range([_size, 0]);

    var _g = view.append('svg:g')
      .attr('transform', 'translate(' + _gx + ', ' + _gy + ')');

    var _path = _g.append('path')
      .attr('class', 'crossfilter bar')
      .style('fill', this._colorScale(i));

    var _scaleBrush = d3.scale.linear()
      .domain([_bound.min, _bound.max])
      .range([0, _size]);
    var _brush = d3.svg.brush()
      .x(_scaleBrush)
      .on('brush', function() {
        if (_brush.empty()) {
          _dim.filterAll();
        } else {
          _dim.filterRange(_brush.extent());
        }
        charts.each(function(chart) {
          chart.draw();
        });
      });

    var _axis = d3.svg.axis()
      .scale(_scaleBrush)
      .ticks(_numTicks(_size))
      .tickSize(0);
    _g.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(0, ' + _size + ')')
      .call(_axis);

    _g.append('g')
      .attr('class', 'brush')
      .call(_brush)
      .selectAll('rect')
        .attr('y', 0)
        .attr('height', _size);

    _g.append('svg:text')
      .attr('class', 'crossfilter caption')
      .attr('x', 8)
      .attr('y', 8)
      .attr('dy', '.71em')
      .attr('text-anchor', 'start')
      .text(_caption(code));

    function _barPath() {
      var path = [];
      _group.all().each(function(d) {
        path.push(
          'M', Math.floor(_scaleX(d.key)) + 0.5, ',', _size,
          'V', Math.floor(_scaleY(d.value)) + 0.5,
          'H', Math.floor(_scaleX(d.key + 1)) - 0.5,
          'V', _size
        );
      });
      return path.join('');
    }

    function draw() {
      _path.attr('d', _barPath());
    }

    charts.push({
      draw: draw
    });
  },
  render: function(view, args) {
    var w = view.attr('width'),
        h = view.attr('height'),
        n = args.channels.length;
    if (n > 32) {
      throw new Error('crossfilter only supports up to 32 dimensions!');
    }

    var it = new IntersectionIterator(args.channels.map(function(c) {
      return c.iter();
    }));
    var data = [];
    while (true) {
      try {
        var t = it.next();
        var xs = args.channels.map(function(c) {
          return c.at(t);
        });
        data.push(xs);
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }

    var filter = crossfilter(data),
        grid = this._determineGrid(w, h, n),
        charts = [];
    for (var i = 0; i < n; i++) {
      var code = args.__code.channels[i];
      if (typeOf(data[0][i]) === 'string') {
        this._makeCategoricalBarChart(view, filter, data, grid, code, charts);
      } else {
        this._makeNumericBarChart(view, filter, data, grid, code, charts);
      }
      charts[i].draw();
    }
  }
};

var HistogramView = {
  _getData: function(c, groupBy, bucketing) {
    var it = c.iter(),
        data = [];
    if (groupBy !== undefined) {
      it = new IntersectionIterator([it, groupBy.iter()]);
    }
    while (true) {
      try {
        var t = it.next(),
            x = c.at(t),
            g = x;
        if (groupBy !== undefined) {
          g = groupBy.at(t);
        }
        if (bucketing !== undefined) {
          g = Math.floor(g / bucketing) * bucketing;
        }
        data.push({g: g, x: x});
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    data.sort(function(d1, d2) { return d1.g - d2.g; });
    return data;
  },
  _getHist: function(data, reduce) {
    var hist = [],
        n = 0;
    data.each(function(d) {
      if (n === 0 || d.g > hist[n - 1].g) {
        hist.push({g: d.g, xs: []});
        n++;
      }
      hist[n - 1].xs.push(d.x);
    });
    return hist.map(function(d) {
      return {x: d.g, freq: reduce(d.xs)};
    });
  },
  render: function(view, args) {
    var w = view.attr('width'),
        h = view.attr('height'),
        axisH = 20,
        axisW = 60;

    var bucketing = args.bucket;
    if (bucketing === undefined) {
      if (args.groupBy === undefined) {
        bucketing = _getBucketing(args.__code.channel);
      } else {
        bucketing = _getBucketing(args.__code.groupBy);
      }
    }
    var reduce = args.reduce;
    if (reduce === undefined) {
      if (args.groupBy === undefined) {
        reduce = 'count';
      } else {
        reduce = 'sum';
      }
    }
    reduce = Reduce.get(reduce);

    var data = this._getData(args.channel, args.groupBy, bucketing),
        hist = this._getHist(data, reduce),
        xs = hist.map(function(p) { return p.x; }),
        xmin = d3.min(xs) || 0,
        xmax = d3.max(xs) || 0,
        freqs = hist.map(function(p) { return p.freq; }),
        applyBuckets = args.bucket !== undefined;
    if (xmin === xmax) {
      xmin--;
      xmax++;
    }

    var histH = h - 2 * axisH,
        histW = w - 2 * axisW;
    if (bucketing !== undefined) {
      var buckets = Math.round((xmax - xmin) / bucketing),
          bucketW = histW / (buckets + 1);
      if (bucketW < 3) {
        bucketing = undefined;
      } else {
        xmax += bucketing;
      }
    }
    var scaleX = d3.scale.linear()
      .domain([xmin, xmax])
      .range([0, histW]);
    var scaleFreq = d3.scale.linear()
      .domain([0, d3.max(freqs) || 1])
      .range([histH, 0]);

    var cc = d3.scale.category10();

    // axes
    var axisX = d3.svg.axis()
      .scale(scaleX)
      .ticks(_numTicks(histW))
      .tickSize(0);
    view.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + axisW + ', ' + (histH + axisH) + ')')
      .call(axisX);
    var axisFreq = d3.svg.axis()
      .scale(scaleFreq)
      .orient('left')
      .ticks(_numTicks(histH))
      .tickSize(0);
    view.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + axisW + ', ' + axisH + ')')
      .call(axisFreq);

    // histogram
    var g = view.append('svg:g')
      .attr('transform', 'translate(' + axisW + ', ' + axisH + ')');
    if (bucketing === undefined) {
      var opacity = Math.max(0.2, 1 / Math.log(Math.max(2, data.length)));
      g.selectAll('line')
        .data(hist)
        .enter().append('svg:line')
          .attr('x1', function(d) { return scaleX(d.x); })
          .attr('y1', function(d) { return scaleFreq(d.freq); })
          .attr('x2', function(d) { return scaleX(d.x); })
          .attr('y2', histH)
          .attr('opacity', opacity)
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
      .text(_caption(args.__code.channel));
  }
};

var PlotView = {
  _drawRegressionLine: function(data, g, scaleX, scaleY, xbound) {
    if (data.length <= 5) {
      return;
    }
    var regress = Stats.linregress(data);
    if (regress.R <= 0.1) {
      return;
    }
    g.append('svg:line')
      .attr('id', 'foo')
      .attr('class', 'plot regression')
      .attr('x1', scaleX(xbound.min))
      .attr('y1', scaleY(regress.L(xbound.min)))
      .attr('x2', scaleX(xbound.max))
      .attr('y2', scaleY(regress.L(xbound.max)))
      .attr('opacity', Math.abs(regress.R));
  },
  render: function(view, args) {
    var w = view.attr('width'),
        h = view.attr('height'),
        axisH = 20,
        axisW = 60;

    // extract data from channels
    var data = [],
        iters = [args.x.iter(), args.y.iter()],
        hasArea = args.area !== undefined,
        hasColor = args.color !== undefined,
        colorIsCategorical = null,
        categories = {},
        lastCategory = 0;
    if (hasArea) {
      iters.push(args.area.iter());
    }
    if (hasColor) {
      iters.push(args.color.iter());
    }
    var it = new IntersectionIterator(iters);

    while (true) {
      try {
        var t = it.next(),
            d = {};
        d.x = args.x.at(t);
        d.y = args.y.at(t);
        if (hasArea) {
          d.A = args.area.at(t);
          // HACK: allow only color (without area)
          if (typeOf(d.A) === 'string') {
            delete d.A;
            args.color = args.area;
            args.__code.color = args.__code.area;
            args.area = undefined;
            args.__code.area = undefined;
            hasColor = true;
            hasArea = false;
          }
        }
        if (hasColor) {
          d.c = args.color.at(t);
          if (colorIsCategorical === null) {
            colorIsCategorical = typeOf(d.c) === 'string';
          }
          if (colorIsCategorical && categories[d.c] === undefined) {
            categories[d.c] = lastCategory++;
          }
        }
        data.push(d);
      } catch(e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }

    // get bounds
    var xfiltering = _getFiltering(args.__code.x, 'value-between'),
        yfiltering = _getFiltering(args.__code.y, 'value-between'),
        bounds = {};

    bounds.x = xfiltering || _getBound(data, 'x');
    _fixBound(bounds.x);
    bounds.y = yfiltering || _getBound(data, 'y');
    _fixBound(bounds.y);
    if (hasArea) {
      bounds.A = _getBound(data, 'A');
      _fixBound(bounds.A);
    }
    if (hasColor && !colorIsCategorical) {
      bounds.c = _getBound(data, 'c');
      _fixBound(bounds.c);
    }

    // create scales
    var plotH = h - 2 * axisH,
        plotW = w - 2 * axisW,
        scales = {};
    scales.x = d3.scale.linear()
      .domain([bounds.x.min, bounds.x.max])
      .nice()
      .range([0, plotW]);
    scales.y = d3.scale.linear()
      .domain([bounds.y.min, bounds.y.max])
      .nice()
      .range([plotH, 0]);
    if (hasArea) {
      scales.r = d3.scale.sqrt()
        .domain([bounds.A.min, bounds.A.max])
        .range([2, 20]);
    }
    scales.c = d3.scale.category10();
    if (hasColor && !colorIsCategorical) {
      scales.c = d3.scale.linear()
        .domain([bounds.c.min, (bounds.c.min + bounds.c.max) / 2, bounds.c.max])
        .range(['rgb(239,138,98)','rgb(247,247,247)','rgb(103,169,207)']);
    }

    // axes
    var axisX = d3.svg.axis()
      .scale(scales.x)
      .ticks(_numTicks(plotW))
      .tickSize(0);
    var axisGroupX = view.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + axisW + ', ' + (plotH + axisH) + ')')
      .call(axisX);
    axisGroupX.append('svg:line')
      .attr('class', 'range')
      .attr('x1', scales.x(bounds.x.min))
      .attr('y1', 0)
      .attr('x2', scales.x(bounds.x.max))
      .attr('y2', 0);
    var axisY = d3.svg.axis()
      .scale(scales.y)
      .orient('left')
      .ticks(_numTicks(plotH))
      .tickSize(0);
    var axisGroupY = view.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + axisW + ', ' + axisH + ')')
      .call(axisY);
    axisGroupY.append('svg:line')
      .attr('class', 'range')
      .attr('x1', 0)
      .attr('y1', scales.y(bounds.y.min))
      .attr('x2', 0)
      .attr('y2', scales.y(bounds.y.max));

    // projection ticks
    var projX = ViewUtils.getProjection(data, scales.x, 'x');
    ViewUtils.drawHorizontalProjectionTicks(projX, axisGroupX);

    var projY = ViewUtils.getProjection(data, scales.y, 'y');
    ViewUtils.drawVerticalProjectionTicks(projY, axisGroupY);

    // plot
    var g = view.append('svg:g')
      .attr('transform', 'translate(' + axisW + ', ' + axisH + ')');
    data.each(function(d) {
      var circle = g.append('svg:circle')
        .attr('cx', scales.x(d.x))
        .attr('cy', scales.y(d.y));
      var r = 3;
      if (hasArea) {
        r = scales.r(d.A);
      }
      circle.attr('r', r);
      var colorIndex = 0;
      if (hasColor) {
        if (colorIsCategorical) {
          colorIndex = categories[d.c];
        } else {
          colorIndex = d.c;
        }
      }
      var color = d3.rgb(scales.c(colorIndex));
      circle
        .attr('fill', color.brighter(0.5))
        .attr('stroke', color.darker(0.5));
    });
    g.append('svg:text')
      .attr('class', 'plot caption')
      .attr('x', plotW - 8)
      .attr('y', plotH - 8)
      .attr('text-anchor', 'end')
      .text(_caption(args.__code.x));
    g.append('svg:text')
      .attr('class', 'plot caption')
      .attr('x', 8)
      .attr('y', 8)
      .attr('dy', '.71em')
      .text(_caption(args.__code.y));

    // regression line
    this._drawRegressionLine(data, g, scales.x, scales.y, bounds.x);
  }
};

var LibFistUI = {
  import: function() {
    FistUI.importView('line', LineView);
    FistUI.importView('crossfilter', CrossfilterView);
    FistUI.importView('histogram', HistogramView);
    FistUI.importView('plot', PlotView);
  }
};
