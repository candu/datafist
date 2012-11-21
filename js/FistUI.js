var ViewGraphState = new Class({
  initialize: function() {
    this._dummyElem = new Element('div');

    this._nextNodeId = 0;
    this._nodes = {};
    this._edgesOut = {};
    this._edgesIn = {};
  },
  // TODO: abstract away into Listenable
  _fire: function(type, args) {
    this._dummyElem.fireEvent(type, args);
  },
  listen: function(type, callback) {
    this._dummyElem.addEvent(type, callback);
  },
  addNode: function(name, x, y, w, h) {
    var i = this._nextNodeId++;
    this._nodes[i] = {name: name, x: x, y: y, w: w, h: h, index: i};
    this._edgesOut[i] = {};
    this._edgesIn[i] = {};
    this._fire('nodeadded', [this._nodes[i]]);
  },
  deleteNode: function(i) {
    for (var j in this._edgesOut) {
      this.deleteEdge(j);
    }
    delete this._nodes[i];
    this._fire('nodedeleted', [i]);
  },
  addEdge: function(i, j) {
    // add directed edge from i to j
    console.log('adding (' + i + ', ' + j + ')');
    if (this._edgesOut[i][j] !== undefined) {
      console.log('skipping, already there: ' + this._edgesOut[i][j]);
      return;
    }
    this._edgesOut[i][j] = true;
    this._edgesIn[j][i] = true;
    this._fire('edgeadded', [this._nodes[i], this._nodes[j]]);
  },
  deleteEdge: function(i, j) {
    // remove directed edge from j to i
    delete this._edgesOut[i][j];
    delete this._edgesIn[j][i];
    this._fire('edgedeleted', [i, j]);
  },
  toJSON: function() {
    var nodes = {};
    for (var i in this._nodes) {
      nodes[i] = {
        name: this._nodes[i]._name,
        x: this._nodes[i].x,
        y: this._nodes[i]._y
      }
    }
    return JSON.stringify({
      nodes: nodes,
      edges: this._edgesOut
    });
  },
  /**
   * Produce a representation of this ViewGraphState in the fist language.
   */
  toFist: function() {
    var spatialSort = function(indices) {
      indices.sort(function(i, j) {
        var dx = this._nodes[i].x - this._nodes[j].x;
        if (dx !== 0) {
          return dx;
        }
        return this._nodes[i].y - this._nodes[j].y;
      }.bind(this));
    }.bind(this);
    var depthWalk = function(i) {
      var S = Object.keys(this._edgesIn[i]);
      if (S.length === 0) {
        return this._nodes[i].name;
      }
      spatialSort(S);
      var sexp = S.map(depthWalk);
      sexp.unshift(this._nodes[i].name);
      return '(' + sexp.join(' ') + ')';
    }.bind(this);
    var T = [];
    for (var i in this._edgesOut) {
      if (Object.isEmpty(this._edgesOut[i])) {
        T.push(i);
      }
    }
    spatialSort(T);
    return T.map(function(i) {
      return depthWalk(i);
    });
  }
});
ViewGraphState.fromJSON = function(json) {
  // TODO: implement this
  throw new Error('not implemented yet');
};

var ViewNode = new Class({
  initialize: function(graph, svg, node) {
    this._g = svg.append('svg:g')
      .data([node])
      .attr('transform', function(d) {
        return 'translate(' + d.x + ', ' + d.y + ')';
      })
      .on('click', function(d) {
        this._onNodeClicked(d);
      }.bind(graph));
    this._g.append('svg:rect')
      .attr('class', 'block')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', node.w)
      .attr('height', node.h);
    this._g.append('svg:text')
      .attr('class', 'block')
      .attr('x', node.w / 2)
      .attr('y', node.h / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(node.name);
  },
  update: function() {
    this._g.attr('transform', function(d) {
      return 'translate(' + d.x + ', ' + d.y + ')';
    });
  },
  cleanup: function() {
    this._g.remove();
  }
});

var ViewEdge = new Class({
  initialize: function(graph, svg, node1, node2) {
    this._line = svg.append('svg:line')
      .data([{from: node1, to: node2}])
      .attr('class', 'edge')
      .attr('x1', function(d) { return d.from.x + d.from.w / 2; })
      .attr('y1', function(d) { return d.from.y + d.from.h / 2; })
      .attr('x2', function(d) { return d.to.x + d.to.w / 2; })
      .attr('y2', function(d) { return d.to.y + d.to.h / 2; });
    // TODO: add arrowhead
  },
  update: function() {
    this._line
      .attr('x1', function(d) { return d.from.x + d.from.w / 2; })
      .attr('y1', function(d) { return d.from.y + d.from.h / 2; })
      .attr('x2', function(d) { return d.to.x + d.to.w / 2; })
      .attr('y2', function(d) { return d.to.y + d.to.h / 2; });
  },
  cleanup: function() {
    this._line.remove();
  }
});


var ViewGraph = new Class({
  initialize: function(svg, state, repl) {
    this._svg = svg;
    this._state = state;
    this._repl = repl;
    this._nodes = {};
    this._edges = {};

    this._nodeClicked = null;
    this._state.listen('nodeadded', function(node) {
      this._nodes[node.index] = new ViewNode(this, this._svg, node);
      this._edges[node.index] = {};
      this._repl.set('text', this._state.toFist().join(' '));
    }.bind(this));
    this._state.listen('edgeadded', function(node1, node2) {
      this._edges[node1.index][node2.index] =
        new ViewEdge(this, this._svg, node1, node2);
      this._repl.set('text', this._state.toFist().join(' '));
    }.bind(this));
  },
  _onNodeClicked: function(d) {
    if (this._nodeClicked === null) {
      this._nodeClicked = d.index;
    } else {
      if (this._nodeClicked !== d.index) {
        this._state.addEdge(this._nodeClicked, d.index);
      }
      this._nodeClicked = null;
    }
  }
});


var FistUI = new Class({
  initialize: function(fist, root) {
    this._viewTable = {};
    this._viewGraphState = new ViewGraphState();

    this._fist = fist;
    this._root = root;

    this._dragBlock = null;

    // set up palette
    this._palette = this._root.getElement('#palette');

    // set up viewer
    this._viewer = this._root.getElement('#viewer');
    this._svgWrapper = this._root.getElement('#svg_wrapper');
    var w = this._svgWrapper.getWidth() - 2,
        h = this._svgWrapper.getHeight() - 2;
    this._svg = d3.select(this._svgWrapper)
      .append('svg:svg')
      .attr('width', w)
      .attr('height', h);
    this._svgWrapper.addEventListener('dragenter', function(evt) {
      this.addClass('droptarget');
    }, false);
    this._svgWrapper.addEventListener('dragover', function(evt) {
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'move';
      return false;
    }, false);
    this._svgWrapper.addEventListener('dragleave', function(evt) {
      this.removeClass('droptarget');
    }, false);
    this._svgWrapper.addEventListener('drop', function(evt) {
      evt.stopPropagation();
      var name = evt.dataTransfer.getData('text/plain');
      var svgPosition = this._svgWrapper.getPosition(),
          blockSize = this._dragBlock.getSize(),
          blockX = Math.floor(evt.pageX - svgPosition.x - blockSize.x / 2) + 0.5,
          blockY = Math.floor(evt.pageY - svgPosition.y - blockSize.y / 2) + 0.5,
          blockW = blockSize.x,
          blockH = blockSize.y;
      this._viewGraphState.addNode(name, blockX, blockY, blockW, blockH);
    }.bind(this), false);
    this._viewToggle = this._root.getElement('#view_toggle');
    this._viewToggle.addEvent('click', function(evt) {
      this._viewToggle.toggleClass('on');
      if (this._viewToggle.hasClass('on')) {
        // TODO: render view!
      } else {
        // TODO: render patchboard!
      }
    }.bind(this));

    // set up interpreter
    this._repl = this._root.getElement('#repl');
    this._viewGraph = new ViewGraph(this._svg, this._viewGraphState, this._repl);
    // TODO: something here

    // register event listeners for Fist events
    fist.listen('symbolimport', function(name) {
      this.onSymbolImport(name);
    }.bind(this));
    fist.listen('viewinvoked', function(name, channels) {
      this.onViewInvoked(name, channels);
    }.bind(this));
  },
  _createBlock: function(name) {
    try {
      var value = this._fist.execute(name);
      return new Element('div.block.' + typeOf(value), {
        text: name,
      });
    } catch (e) {
      return null;
    }
  },
  onSymbolImport: function(name) {
    var block = this._createBlock(name);
    block.set('draggable', true);
    block.addEventListener('dragstart', function(evt) {
      block.addClass('dragtarget');
      evt.dataTransfer.effectAllowed = 'move';
      evt.dataTransfer.setData('text/plain', block.get('text'));
      this._dragBlock = block;
    }.bind(this), false);
    block.addEventListener('dragend', function(evt) {
      this._dragBlock = null;
      block.removeClass('dragtarget');
      this._svgWrapper.removeClass('droptarget');
    }.bind(this), false);
    block.inject(this._palette);
  },
  onViewInvoked: function(name, channels) {
    console.log('rendering view ' + name);
    var view = this._viewTable[name];
    if (view === undefined) {
      throw new Error('unrecognized view: ' + name);
    }
    view.render(channels, this._viewer);
  },
  importView: function(name, view) {
    console.log('importing view ' + name);
    this._viewTable[name] = view;
  }
});
