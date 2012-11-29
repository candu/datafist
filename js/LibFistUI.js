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

var ChannelView = {
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

    // create w/h scales for all channels
    var channelH = (h - axisH) / n,
        channelW = w - axisW;
    var ct = d3.scale.linear()
      .domain([ctMin, ctMax])
      .range([0, channelW]);
    var cxs = cds.map(function(cd, i) {
      var cxMin = d3.min(cd, function(a) {
        return a.x;
      });
      var cxMax = d3.max(cd, function(a) {
        return a.x;
      });
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
  }
  // TODO: update height automatically on window resize?
};

var HistogramView = {
  render: function(channels, view, sexps) {
    var w = view.attr('width'),
        h = view.attr('height');

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
        freqs = hist.map(function(p) { return p.freq; });
    var scaleX = d3.scale.linear()
      .domain([d3.min(xs), d3.max(xs)])
      .range([0, w]);
    var scaleFreq = d3.scale.linear()
      .domain([0, d3.max(freqs)])
      .range([h, 0]);

    var cc = d3.scale.category10();

    var bucketing = _getBucketing(sexps[0]);
    if (bucketing === null) {
      view.selectAll('line')
        .data(hist)
        .enter().append('svg:line')
          .attr('x1', function(d) { return scaleX(d.x); })
          .attr('y1', function(d) { return scaleFreq(d.freq); })
          .attr('x2', function(d) { return scaleX(d.x); })
          .attr('y2', h)
          .attr('opacity', 0.3)
          .attr('stroke', cc(0))
          .attr('stroke-width', 2);

    } else {
      var buckets = Math.round((d3.max(xs) - d3.min(xs)) / bucketing),
          bucketW = w / (buckets + 1);
      view.selectAll('rect')
        .data(hist)
        .enter().append('svg:rect')
          .attr('x', function(d) { return scaleX(d.x); })
          .attr('y', function(d) { return scaleFreq(d.freq); })
          .attr('width', bucketW)
          .attr('height', function(d) { return h - scaleFreq(d.freq); })
          .attr('fill', cc(0));
    }
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
    // TODO: intersection iterator?
    var it = MergeIterator([channels[0].iter(), channels[1].iter()]);
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
        ys = data.map(function(p) { return p.y; });

    // create scales
    var plotH = h - 2 * axisH,
        plotW = w - 2 * axisW;
    var scaleX = d3.scale.linear()
      .domain([d3.min(xs), d3.max(xs)])
      .range([0, plotW]);
    var scaleY = d3.scale.linear()
      .domain([d3.min(ys), d3.max(ys)])
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
  }
};

var LibFistUI = {
  import: function(fistUI) {
    fistUI.importView('channel', ChannelView);
    fistUI.importView('histogram', HistogramView);
    fistUI.importView('regression', RegressionView);
  }
};
