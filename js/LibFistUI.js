'use strict';

function _numTicks(px) {
  return Math.max(3, Math.min(7, Math.floor(px / 100)));
}

function _caption(sexp) {
  return SExp.unparse(sexp);
}

function _getBucketing(sexp) {
  if (SExp.isAtom(sexp)) {
    return undefined;
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
  return undefined;
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

function _stripFilters(sexp, filterName) {
  var cur = sexp;
  while (SExp.isList(cur) && cur[0] === filterName) {
    cur = cur[1];
  }
  return cur;
}

function _getFiltering(sexp, filterName) {
  if (sexp[0] === filterName) {
    return {min: parseFloat(sexp[2]), max: parseFloat(sexp[3])};
  }
  return undefined;
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
        sexps = args.__sexps.channels;

    // extract data from channels
    var n = channels.length,
        cds = [],
        tbound = {min: Infinity, max: -Infinity},
        xbounds = [];
    for (var i = 0; i < n; i++) {
      cds.push([]);
      var filtering = _getFiltering(sexps[i], 'time-between');
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
        .text(_caption(sexps[i]));
      this._xGuides.push(g.append('svg:line')
        .attr('class', 'channel guide')
        .attr('x1', 0)
        .attr('x2', channelW)
        .style('stroke', cc(i))
      );
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
      .call(dragBehavior)
      .on('mousemove', function() {
        var mousePos = $d3(this._dragGroup).getPosition(),
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
      }.bind(this));

    var dragSelectionBehavior = d3.behavior.drag()
      .on('drag', function(d) {
        var x = parseFloat(this._dragSelectionArea.attr('x')),
            w = parseFloat(this._dragSelectionArea.attr('width'));
        x += d3.event.dx;
        x = Math.max(0, Math.min(x, channelW - w));
        this._dragSelectionArea.attr('x', x);
      }.bind(this));

    this._dragSelectionArea = this._dragGroup.append('svg:rect')
      .attr('class', 'hidden')
      .on('click', function(d) {
        var x1 = parseFloat(this._dragSelectionArea.attr('x')),
            x2 = x1 + parseFloat(this._dragSelectionArea.attr('width')),
            tRaw = [+(ct.invert(x1)), +(ct.invert(x2))],
            t = Interval.nice(tRaw);
        console.log(tRaw, t);
        var filteredSexp = sexps.map(function(sexp) {
          var sexpF = _stripFilters(sexp, 'time-between');
          return ['time-between', sexpF, _format(t[0]), _format(t[1])];
        }.bind(this));
        filteredSexp.unshift('view-line');
        $d3(view).fireEvent('sexpreplaced', [filteredSexp]);
      }.bind(this))
      .call(dragSelectionBehavior);
  }
};

var CrossfilterView = {
  render: function(view, args) {
    // TODO: implement this
  }
};

var HistogramView = {
  _getData: function(c, groupBy, bucketing) {
    var it = c.iter(),
        data = [];
    if (groupBy !== undefined) {
      it = IntersectionIterator([it, groupBy.iter()]);
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
        bucketing = _getBucketing(args.__sexps.channel);
      } else {
        bucketing = _getBucketing(args.__sexps.groupBy);
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
      .text(_caption(args.__sexps.channel));

    // value-filtering hit area
    // TODO: merge this with time-filtering code from LineView
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

    var dragSelectionBehavior = d3.behavior.drag()
      .on('drag', function(d) {
        var x = parseFloat(this._dragSelectionArea.attr('x')),
            w = parseFloat(this._dragSelectionArea.attr('width'));
        x += d3.event.dx;
        x = Math.max(0, Math.min(x, histW - w));
        this._dragSelectionArea.attr('x', x);
      }.bind(this));

    this._dragSelectionArea = this._dragGroup.append('svg:rect')
      .attr('class', 'hidden')
      .on('click', function(d) {
        var x1 = parseFloat(this._dragSelectionArea.attr('x')),
            x2 = x1 + parseFloat(this._dragSelectionArea.attr('width')),
            x = Interval.nice([+(scaleX.invert(x1)), +(scaleX.invert(x2))]);
        if (args.groupBy === undefined) {
          var sexpX = _stripFilters(args.__sexps.channel, 'value-between');
          var filteredSExp = [
            'view-histogram',
            ['value-between', sexpX, _format(x[0]), _format(x[1])]
          ];
        } else {
          var sexpX = _stripFilters(args.__sexps.groupBy, 'value-between');
          var filteredSExp = [
            'view-histogram',
            args.__sexps.c,
            ['value-between', sexpX, _format(x[0]), _format(x[1])]
          ];
        }
        if (args.bucket !== undefined) {
          filteredSExp.push(args.__sexps.bucket);
        }
        $d3(view).fireEvent('sexpreplaced', [filteredSExp]);
      }.bind(this))
      .call(dragSelectionBehavior);
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
  _getBound: function(data, key) {
    return {
      min: d3.min(data, function(d) { return d[key]; }),
      max: d3.max(data, function(d) { return d[key]; })
    };
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
    var it = IntersectionIterator(iters);

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
            args.area = undefined;
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
    var xfiltering = _getFiltering(args.__sexps.x, 'value-between'),
        yfiltering = _getFiltering(args.__sexps.y, 'value-between'),
        bounds = {};

    bounds.x = xfiltering || this._getBound(data, 'x');
    _fixBound(bounds.x);
    bounds.y = yfiltering || this._getBound(data, 'y');
    _fixBound(bounds.y);
    if (hasArea) {
      bounds.A = this._getBound(data, 'A');
      _fixBound(bounds.A);
    }
    if (hasColor && colorIsCategorical) {
      bounds.c = this._getBound(data, 'c');
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
        .domain(['#f00', '#00f'])
        .range([bounds.c.min, bounds.c.max]);
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
      .text(_caption(args.__sexps.x));
    g.append('svg:text')
      .attr('class', 'plot caption')
      .attr('x', 8)
      .attr('y', 8)
      .attr('dy', '.71em')
      .text(_caption(args.__sexps.y));

    // regression line
    this._drawRegressionLine(data, g, scales.x, scales.y, bounds.x);

    // region-filtering hit area
    // TODO: merge this with time-filtering code from LineView
    this._selectionStart = null;
    var dragBehavior = d3.behavior.drag()
      .on('dragstart', function(d) {
        var dragPos = $d3(this._dragGroup).getPosition(),
            x = d3.event.sourceEvent.pageX - dragPos.x,
            y = d3.event.sourceEvent.pageY - dragPos.y;
        this._selectionStart = {x: x, y: y};
        this._dragSelectionArea
          .attr('class', 'plot selection-area')
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
          .attr('class', 'plot selection-area')
          .attr('x', Math.min(x, this._selectionStart.x))
          .attr('y', Math.min(y, this._selectionStart.y))
          .attr('width', Math.abs(x - this._selectionStart.x))
          .attr('height', Math.abs(y - this._selectionStart.y));
      }.bind(this));

    this._dragGroup = view.append('svg:g')
      .attr('transform', 'translate(' + axisW + ', ' + axisH + ')');
    this._dragHitArea = this._dragGroup.append('svg:rect')
      .attr('class', 'plot hit-area')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', plotW)
      .attr('height', plotH)
      .call(dragBehavior);

    var dragSelectionBehavior = d3.behavior.drag()
      .on('drag', function(d) {
        var x = parseFloat(this._dragSelectionArea.attr('x')),
            y = parseFloat(this._dragSelectionArea.attr('y')),
            w = parseFloat(this._dragSelectionArea.attr('width')),
            h = parseFloat(this._dragSelectionArea.attr('height'));
        x += d3.event.dx;
        y += d3.event.dy;
        x = Math.max(0, Math.min(x, plotW - w));
        y = Math.max(0, Math.min(y, plotH - h));
        this._dragSelectionArea.attr('x', x);
        this._dragSelectionArea.attr('y', y);
      }.bind(this));

    this._dragSelectionArea = this._dragGroup.append('svg:rect')
      .attr('class', 'hidden')
      .on('click', function(d) {
        var x1 = parseFloat(this._dragSelectionArea.attr('x')),
            x2 = x1 + parseFloat(this._dragSelectionArea.attr('width')),
            x = Interval.nice([+(scales.x.invert(x1)), +(scales.x.invert(x2))]),
            y1 = parseFloat(this._dragSelectionArea.attr('y')),
            y2 = y1 + parseFloat(this._dragSelectionArea.attr('height')),
            y = Interval.nice([+(scales.y.invert(y2)), +(scales.y.invert(y1))]),
            sexpX = _stripFilters(args.__sexps.x, 'value-between'),
            sexpY = _stripFilters(args.__sexps.y, 'value-between');
        var filteredSexp = [
          'view-plot',
          ['value-between', sexpX, _format(x[0]), _format(x[1])],
          ['value-between', sexpY, _format(y[0]), _format(y[1])]
        ]
        $d3(view).fireEvent('sexpreplaced', [filteredSexp]);
      }.bind(this))
      .call(dragSelectionBehavior);
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
