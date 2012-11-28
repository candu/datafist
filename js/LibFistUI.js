var ChannelView = {
  render: function(channels, view) {
    // TODO: verify that there's at least one channel

    var w = view.attr('width'),
        h = view.attr('height');

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
    var ct = d3.scale.linear()
      .domain([ctMin, ctMax])
      .range([0, w]);
    var cxs = cds.map(function(cd, i) {
      var cxMin = d3.min(cd, function(a) {
        return a.x;
      });
      var cxMax = d3.max(cd, function(a) {
        return a.x;
      });
      return d3.scale.linear()
        .domain([cxMin, cxMax])
        .range([h * i / n, h * (i + 1) / n]);
    });

    // color scale!
    var cc = d3.scale.category10();

    // now, actually graph these things
    for (var i = 0; i < n; i++) {
      var line = d3.svg.line()
        .x(function(d) { return ct(d.t); })
        .y(function(d) { return cxs[i](d.x); });
      view.append('svg:path')
        .attr('d', line(cds[i]))
        .attr('class', 'channel')
        .attr('stroke', cc(i));
    }
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
