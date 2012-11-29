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
    var channelHeight = (h - axisH) / n,
        channelWidth = w - axisW;
    var ct = d3.scale.linear()
      .domain([ctMin, ctMax])
      .range([0, channelWidth]);
    var cxs = cds.map(function(cd, i) {
      var cxMin = d3.min(cd, function(a) {
        return a.x;
      });
      var cxMax = d3.max(cd, function(a) {
        return a.x;
      });
      return d3.scale.linear()
        .domain([cxMin, cxMax])
        .range([channelHeight - axisH / 2, axisH / 2]);
    });

    // color scale!
    var cc = d3.scale.category10();

    // axes
    var scaleT = d3.time.scale()
      .domain([ctMin, ctMax])
      .range([0, channelWidth]);
    var axisT = d3.svg.axis()
      .scale(scaleT)
      .ticks(10)
      .tickSize(-channelHeight * n);
    view.append('svg:g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + axisW + ', ' + (channelHeight * n) + ')')
      .call(axisT);
    for (var i = 0; i < n; i++) {
      var axisX = d3.svg.axis()
        .scale(cxs[i])
        .orient('left')
        .ticks(5)
        .tickSize(-channelWidth);
      var g = view.append('svg:g')
        .attr('class', 'channel axis')
        .attr('transform', 'translate(' + axisW + ', ' + (channelHeight * i) + ')')
        .call(axisX);
    }

    // sparklines
    for (var i = 0; i < n; i++) {
      var line = d3.svg.line()
        .x(function(d) { return ct(d.t); })
        .y(function(d) { return cxs[i](d.x); });
      var g = view.append('svg:g')
        .attr('transform', 'translate(' + axisW + ', ' + (channelHeight * i) + ')');
      g.append('svg:path')
          .attr('d', line(cds[i]))
          .attr('class', 'channel')
          .attr('stroke', cc(i));
      if (i > 0) {
        g.append('svg:line')
          .attr('class', 'channel-separator')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', channelWidth)
          .attr('y2', 0);
      }
      var caption = SExp.unparse(sexps[i]);
      if (caption.length > 30) {
      }
      g.append('svg:text')
        .attr('class', 'channel-caption')
        .attr('x', channelWidth - 8)
        .attr('y', 8)
        .attr('dy', '.71em')
        .attr('text-anchor', 'end')
        .text(this._caption(sexps[i]));
    }
  },
  _caption: function(sexp) {
    var s = SExp.unparse(sexp);
    if (s.length > 30) {
      s = s.substring(0, 27) + '...';
    }
    return s;
  }
  // TODO: update height automatically on window resize?
};

var HistogramView = {
  render: function(channels, view) {
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

    view.selectAll('rect')
      .data(hist)
      .enter().append('svg:rect')
        .attr('x', function(d) { return scaleX(d.x); })
        .attr('y', function(d) { return scaleFreq(d.freq); })
        .attr('width', 10)
        .attr('height', function(d) { return h - scaleFreq(d.freq); })
        .attr('fill', cc(0));
  }
};

var RegressionView = {
  render: function(channels, view) {
    var w = view.attr('width'),
        h = view.attr('height');

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
    var scaleX = d3.scale.linear()
      .domain([d3.min(xs), d3.max(xs)])
      .range([0, w]);
    var scaleY = d3.scale.linear()
      .domain([d3.min(ys), d3.max(ys)])
      .range([h, 0]);

    // color scale!
    var cc = d3.scale.category10();

    // now, actually graph this thing
    view.selectAll('circle')
      .data(data)
      .enter().append('svg:circle')
        .attr('cx', function (d) { return scaleX(d.x); })
        .attr('cy', function (d) { return scaleY(d.y); })
        .attr('r', 4)
        .attr('fill', cc(0));
  }
};

var LibFistUI = {
  import: function(fistUI) {
    fistUI.importView('channel', ChannelView);
    fistUI.importView('histogram', HistogramView);
    fistUI.importView('regression', RegressionView);
  }
};
