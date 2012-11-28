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
        .nice()
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
        data.push({t: t, x: x, y: y});
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
      .nice()
      .range([0, w]);
    var scaleY = d3.scale.linear()
      .domain([d3.min(ys), d3.max(ys)])
      .nice()
      .range([h, 0]);

    // color scale!
    var cc = d3.scale.category10();

    // now, actually graph this thing
    var symbol = d3.svg.symbol()
      .type('circle')
      .size(8);
    view.selectAll('path')
      .data(data)
      .enter().append('svg:path')
        .attr('transform', function (d) {
          return 'translate(' + scaleX(d.x) + ', ' + scaleY(d.y) + ')';
        })
        .attr('d', symbol)
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
