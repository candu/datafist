'use strict';

var ViewGraphState = new Class({
  initialize: function() {
    this._dummyElem = new Element('div');

    this._nextNodeID = 0;
    this._nodes = {};
    this._edgesOut = {};
    this._edgesIn = {};
    this._fistCode = '';
  },
  // TODO: abstract away into Listenable
  _fire: function(type, args) {
    this._dummyElem.fireEvent(type, args);
  },
  listen: function(type, callback) {
    this._dummyElem.addEvent(type, callback);
  },
  addNode: function(name, type, x, y, w, h) {
    var i = this._nextNodeID++;
    this._nodes[i] = {
      name: name,
      type: type,
      x: x,
      y: y,
      w: w,
      h: h,
      index: i
    };
    this._edgesOut[i] = {};
    this._edgesIn[i] = {};
    this._fire('nodeadded', [this._nodes[i]]);
    this._updateFist();
    return i;
  },
  deleteNode: function(i) {
    var outEdges = Object.keys(this._edgesOut[i]);
    var inEdges = Object.keys(this._edgesIn[i]);
    outEdges.each(function(j) {
      delete this._edgesIn[j][i];
    }.bind(this));
    delete this._edgesIn[i];
    inEdges.each(function(j) {
      delete this._edgesOut[j][i];
    }.bind(this));
    delete this._edgesOut[i];
    delete this._nodes[i];
    this._fire('nodedeleted', [i]);
    this._updateFist();
    // this helps clean up gestural filters
    if (outEdges.length === 1 && inEdges.length === 1) {
      this.addEdge(inEdges[0], outEdges[0]);
    }
  },
  empty: function() {
    var depthDeleteNodes = function(i) {
      var S = Object.keys(this._edgesIn[i]);
      this.deleteNode(i);
      S.each(depthDeleteNodes);
    }.bind(this);
    for (var i in this._edgesOut) {
      if (Object.isEmpty(this._edgesOut[i])) {
        depthDeleteNodes(i);
      }
    }
  },
  addEdge: function(i, j) {
    console.log('adding (' + i + ', ' + j + ')...');
    // enforce DAG property: i -> j will complete a cycle iff there exists a
    // path j -> ... -> i
    var S = {};
    var depthSearch = function(k) {
      S[k] = true;
      if (k === i) {
        return true;
      }
      return Object.keys(this._edgesOut[k]).map(function(n) {
        return parseInt(n);
      }).filter(function(n) {
        return S[n] === undefined;
      }).some(depthSearch);
    }.bind(this);
    if (depthSearch(j)) {
      console.log('skipping, will create cycle!');
      return;
    }
    if (this._edgesOut[i][j] !== undefined) {
      console.log('skipping, already there!');
      return;
    }
    this._edgesOut[i][j] = true;
    this._edgesIn[j][i] = true;
    this._fire('edgeadded', [this._nodes[i], this._nodes[j]]);
    this._updateFist();
  },
  deleteEdge: function(i, j) {
    // remove i -> j
    delete this._edgesOut[i][j];
    delete this._edgesIn[j][i];
    this._fire('edgedeleted', [i, j]);
    this._updateFist();
  },
  toFist: function() {
    return this._fistCode;
  },
  _updateFist: function() {
    var fistCode = this._toFistCode().join(' ');
    if (fistCode !== this._fistCode) {
      this._fistCode = fistCode;
      this._fire('fistmodified');
    }
  },
  /**
   * Produce a representation of this ViewGraphState in the fist language.
   */
  _toFistCode: function() {
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

var ViewEdge = new Class({
  _snapToClosestSides: function(selection, d) {
    var cFrom = {x: d.from.x + d.from.w / 2, y: d.from.y + d.from.h / 2},
        cTo = {x: d.to.x + d.to.w / 2, y: d.to.y + d.to.h / 2},
        dx = cFrom.x - cTo.x,
        dy = cFrom.y - cTo.y;
    selection
      .attr('x1', d.from.x + 6)
      .attr('y1', d.from.y + d.from.h + 2);
    if (dy > dx) {
      if (dy > -dx) {
        // -> bottom
        var f = (dx + dy) / (2 * dy);
        selection
          .attr('x2', d.to.x + f * d.to.w)
          .attr('y2', d.to.y + d.to.h);
      } else {
        // -> left
        var f = (dx - dy) / (2 * dx);
        selection
          .attr('x2', d.to.x)
          .attr('y2', d.to.y + f * d.to.h);
      }
    } else {
      if (dy > -dx) {
        // -> right
        var f = (dy + dx) / (2 * dx);
        selection
          .attr('x2', d.to.x + d.to.w)
          .attr('y2', d.to.y + f * d.to.h);
      } else {
        // -> top
        var f = (dy - dx) / (2 * dy);
        selection
          .attr('x2', d.to.x + f * d.to.w)
          .attr('y2', d.to.y);
      }
    }
  },
  initialize: function(graph, edgeGroup, node1, node2) {
    this._data = {from: node1, to: node2};
    this._line = edgeGroup.append('svg:line')
      .data([this._data])
      .attr('class', 'edge')
      .attr('marker-end', 'url(#edge_end)')
      .call(this._snapToClosestSides, this._data)
      .call(graph.edgeDragBehavior());
  },
  updatePosition: function() {
    this._line
      .call(this._snapToClosestSides, this._data);
  },
  cleanup: function() {
    this._line.remove();
  }
});

var HitArea = new Class({
  initialize: function(node, type, id) {
    this.node = node;
    this.type = type;
    this.id = id;
  },
  isFull: function() {
    return this.type === HitArea.INPUT &&
           this.node.edgeIn(this.id) !== undefined;
  }
});
HitArea.INPUT = 1;
HitArea.OUTPUT = 2;

// TODO: verify that Object.values returns values in key-sorted order
// across all browsers
var Node = new Class({
  initialize: function(graph, nodeGroup, name, pos, id) {
    this.name = name;
    this.type = Fist.blockType(name);
    this.dims = graph.nodeDimensions(name, pos);
    this.id = id;

    this._edgesOut = {};
    this._edgesIn = {};

    this._dragging = false;

    this._g = nodeGroup.append('svg:g')
      .attr('class', 'block')
      .attr('transform', 'translate(' + this.dims.x + ', ' + this.dims.y + ')')
      .on('dblclick', function() {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        var name = window.prompt('edit node name:', this.name);
        if (!name || name === d.name) {
          return;
        }
        this.setName(name);
      }.bind(this))
      .call(Node._dragBehavior(graph, this));

    this._rect = this._g.append('svg:rect')
      .attr('class', 'block ' + this.type)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.dims.w)
      .attr('height', this.dims.h);
    this._text = this._g.append('svg:text')
      .attr('class', 'block ' + this.type)
      .attr('x', this.dims.w / 2)
      .attr('y', this.dims.h / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(this.name);

    this._outputHit = this._g.append('svg:rect')
      .attr('class', 'hit output')
      .attr('x', 0)
      .attr('y', this.dims.h)
      .attr('width', 12)
      .attr('height', 5)
      .on('mouseover', function() {
        this._outputHit.attr('class', 'hit output hover');
      }.bind(this))
      .on('mouseout', function() {
        this._outputHit.attr('class', 'hit output');
      }.bind(this));
      // TODO: fix this behavior
      //.call(graph.edgeCreateBehavior());
  },
  setName: function(name) {
    this.name = name;
    this.type = Fist.blockType(name);
    this.dims = graph.nodeDimensions(name, this.dims);
    this._rect = this._g.append('svg:rect')
      .attr('class', 'block ' + this.type)
      .attr('width', this.dims.w)
      .attr('height', this.dims.h);
    this._text = this._g.append('svg:text')
      .attr('class', 'block ' + this.type)
      .attr('x', this.dims.w / 2)
      .attr('y', this.dims.h / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(this.name);
    return this;
  },
  move: function(dx, dy) {
    this.dims.x += dx;
    this.dims.y += dy;
    this._g.attr('transform', 'translate(' + this.dims.x + ', ' + this.dims.y + ')');
    this.allEdges.each(function(edge) {
      edge.update();
    });
    return this;
  },
  addEdge: function(edge) {
    if (edge.input.node === this) {
      this._edgesIn[edges.input.id] = edge;
    } else if (edge.output.node === this) {
      this._edgesOut[edges.output.id] = edge;
    }
    return this;
  },
  deleteEdge: function(edge) {
    if (edge.input.node === this) {
      delete this._edgesIn[edges.input.id];
    } else if (edge.output.node === this) {
      delete this._edgesOut[edges.output.id];
    }
    return this;
  },
  cleanup: function() {
    this._block.remove();
  },
  edgeIn: function(inputID) {
    return this._edgesIn[inputID];
  },
  edgesOut: function(outputID) {
    return this._edgesOut[outputID];
  },
  allEdgesIn: function() {
    return Object.values(this._edgesIn);
  },
  allEdgesOut: function() {
    return Object.values(this._edgesOut).flatten();
  },
  allEdges: function() {
    return this.allEdgesIn().append(this.allEdgesOut());
  }
});
Node.PADDING = 2;
Node._dragBehavior = function(graph, node) {
  return d3.behavior.drag()
    .origin(Object)
    .on('dragstart', function() {
      node._dragging = true;
    })
    .on('dragend', function() {
      if (!graph.isInViewer(d3.event.sourceEvent.target)) {
        graph.deleteNode(node);
      } else {
        this._dragging = false;
      }
    })
    .on('drag', function() {
      node.move(d3.event.dx, d3.event.dy);
    });
};
Node._depthSearch = function(fromNode, toNode, visited) {
  visited[node._id] = true;
  if (fromNode === toNode) {
    return true;
  }
  var edges = fromNode.edgesOut();
  for (var i = 0; i < edges.length; i++) {
    var nextNode = edges[i].input.node;
    if (visited[nextNode._id]) {
      continue;
    }
    if (Node._depthSearch(nextNode, toNode, visited)) {
      return true;
    }
  }
  return false;
};
Node.existsPath = function(fromNode, toNode) {
  var visited = {};
  return Node._depthSearch(fromNode, toNode, visited);
};

var Edge = new Class({
  initialize: function(output, input) {
  },
  update: function() {

  }
});

var ViewGraph = new Class({
  initialize: function(svg) {
    this._svg = svg;
    this._nextNodeID = 0;
    this._nodes = {};

    this._edgeGroup = this._svg.append('svg:g');
    this._tempEdgeGroup = svg.append('svg:g')
      .attr('transform', 'translate(-1000, -1000)');

    this._tempTextGroup = svg.append('svg:g')
      .attr('transform', 'translate(-1000, -1000)');
    this._tempText = this._tempTextGroup.append('svg:text')
      .attr('class', 'block');

    this._nodeGroup = this._svg.append('svg:g');

    // see http://www.w3.org/TR/SVG/painting.html#Markers for inspiration
    var defs = this._svg.append('defs');
    var edgeEndMarker = defs.append('svg:marker')
      .attr('id', 'edge_end')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 10)
      .attr('refY', 5)
      .attr('markerUnits', 'strokeWidth')
      .attr('markerWidth', 4)
      .attr('markerHeight', 3)
      .attr('fill', '#555')
      .attr('orient', 'auto')
      .append('svg:path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z');
  },
  addNode: function(name, pos) {
    var id = this._nextNodeID++;
    this._nodes[id] = new Node(this, this._nodeGroup, name, pos, id);
  },
  addEdge: function(output, input) {
    if (Node.existsPath(input.node, output.node)) {
      console.log('skipping, will create cycle!');
      return;
    }
    if (input.isBeingUsed()) {
      console.log('skipping, input is already being used!');
      return;
    }
  },
  deleteNode: function(node) {
    node.cleanup();
    node.allEdges.each(function(edge) {
      edge.cleanup();
      node.deleteEdge(edge);
    });
    delete this._nodes[node.id];
  },
  deleteEdge: function(edge) {
    edge.cleanup();
    edge.input.node.deleteEdge(edge);
    edge.output.node.deleteEdge(edge);
  },
  empty: function() {
    Object.values(this._nodes).each(function(node) {
      this.deleteNode(node);
    }.bind(this));
  },
  toFistCode: function() {
  },
  fromFistCode: function(fistCode) {
    // TODO: implement this
  },
  toJSON: function() {
    // TODO: implement this
  },
  fromJSON: function(json) {
    // TODO: implement this
  },
  isInViewer: function(elem) {
    var svgRoot = $d3(this._svg);
    while (elem !== null) {
      if (elem.match(svgRoot)) {
        return true;
      }
      elem = elem.getParent();
    }
    return false;
  },
  nodeDimensions: function(name, pos) {
    this._tempText.text(name);
    var size = $d3(this._tempText).getSize();
    size.x = Math.max(50, size.x);
    var w = size.x + 2 * Node.PADDING,
        h = size.y + 2 * Node.PADDING;
    return {
      x: Math.floor(pos.x - w / 2) + 0.5,
      y: Math.floor(pos.y - h / 2) + 0.5,
      w: w,
      h: h
    };
  }
});

/*
var ViewGraph = new Class({
  initialize: function(svg, state) {
    this._tempEdgeEnd = {};
    this._tempEdge = this._tempEdgeGroup.append('svg:line')
      .attr('class', 'edge temp')
      .attr('marker-end', 'url(#edge_end)')
      .attr('x1', 0)
      .attr('y1', 0);
    this._edgeCreateBehavior = d3.behavior.drag()
      .on('dragstart', function(d) {
        d3.event.sourceEvent.stopPropagation();
        this._tempEdgeGroup
          .attr('transform', 'translate(' + (d.x + 6) + ', ' + (d.y + d.h + 2) + ')');
        this._tempEdgeEnd.x = 0;
        this._tempEdgeEnd.y = 0;
        this._tempEdge
          .attr('x2', this._tempEdgeEnd.x)
          .attr('y2', this._tempEdgeEnd.y);
      }.bind(this))
      .on('dragend', function(d) {
        d3.event.sourceEvent.stopPropagation();
        this._tempEdgeGroup
          .attr('transform', 'translate(-1000, -1000)');
        var targetNode = this._parentNode(d3.event.sourceEvent.target);
        if (targetNode === null) {
        } else if (d.index !== targetNode.index) {
          this._state.addEdge(d.index, targetNode.index);
        }
      }.bind(this))
      .on('drag', function(d) {
        this._tempEdgeEnd.x += d3.event.dx;
        this._tempEdgeEnd.y += d3.event.dy;
        this._tempEdge
          .attr('x2', this._tempEdgeEnd.x)
          .attr('y2', this._tempEdgeEnd.y);
      }.bind(this));

    this._edgeDragBehavior = d3.behavior.drag()
      .on('dragstart', function(d) {
        var edge = this._edgesOut[d.from.index][d.to.index],
            svgPos = $d3(this._svg).getPosition(),
            x = d3.event.sourceEvent.pageX - svgPos.x,
            y = d3.event.sourceEvent.pageY - svgPos.y;
        edge._line
          .attr('class', 'edge temp')
          .attr('x2', x)
          .attr('y2', y);
      }.bind(this))
      .on('dragend', function(d) {
        var targetNode = this._parentNode(d3.event.sourceEvent.target);
        this._state.deleteEdge(d.from.index, d.to.index);
        if (targetNode !== null && d.from.index !== targetNode.index) {
          this._state.addEdge(d.from.index, targetNode.index);
        }
      }.bind(this))
      .on('drag', function(d) {
        var edge = this._edgesOut[d.from.index][d.to.index],
            svgPos = $d3(this._svg).getPosition(),
            x = d3.event.sourceEvent.pageX - svgPos.x,
            y = d3.event.sourceEvent.pageY - svgPos.y;
        edge._line
          .attr('class', 'edge temp')
          .attr('x2', x)
          .attr('y2', y);
      }.bind(this));

    this._state.listen('nodeadded', function(node) {
      this._nodes[node.index] = new ViewNode(this, this._nodeGroup, node);
      this._edgesOut[node.index] = {};
      this._edgesIn[node.index] = {};
    }.bind(this));
    this._state.listen('nodedeleted', function(i) {
      this._deleteNode(i);
    }.bind(this));
    this._state.listen('edgeadded', function(node1, node2) {
      var edge = new ViewEdge(this, this._edgeGroup, node1, node2);
      this._edgesOut[node1.index][node2.index] = edge;
      this._edgesIn[node2.index][node1.index] = edge;
    }.bind(this));
    this._state.listen('edgedeleted', function(i, j) {
      this._deleteEdge(i, j);
    }.bind(this));

    this._tempText = this._tempTextGroup.append('svg:text')
      .attr('class', 'block');
  },
  nodeDragBehavior: function() {
    return this._nodeDragBehavior;
  },
  edgeCreateBehavior: function() {
    return this._edgeCreateBehavior;
  },
  edgeDragBehavior: function() {
    return this._edgeDragBehavior;
  },
  addNode: function(name, x, y) {
    var type = Fist.blockType(name),
        padding = 2,
        blockDimensions = this._getBlockDimensions(x, y, name, padding);
    this._state.addNode(
      name,
      type,
      blockDimensions.x,
      blockDimensions.y,
      blockDimensions.w,
      blockDimensions.h
    );
  },
  _parentNode: function(elem) {
    while (elem !== null) {
      if (elem.match('g.block')) {
        return elem.__data__;
      }
      elem = elem.getParent();
    }
    return null;
  },
  _updateNodeEdges: function(d) {
    for (var i in this._edgesOut[d.index]) {
      this._edgesOut[d.index][i].updatePosition();
    }
    for (var i in this._edgesIn[d.index]) {
      this._edgesIn[d.index][i].updatePosition();
    }
  },
  _onNodeTextChanged: function(d) {
    this._nodes[d.index].updateText();
    this._updateNodeEdges(d);
    this._state._updateFist();
  },
  _deleteNode: function(i) {
    var outEdges = Object.keys(this._edgesOut[i]);
    var inEdges = Object.keys(this._edgesIn[i]);
    outEdges.each(function(j) {
      this._edgesIn[j][i].cleanup();
      delete this._edgesIn[j][i];
    }.bind(this));
    delete this._edgesIn[i];
    inEdges.each(function(j) {
      this._edgesOut[j][i].cleanup();
      delete this._edgesOut[j][i];
    }.bind(this));
    delete this._edgesOut[i];
    this._nodes[i].cleanup();
    delete this._nodes[i];
  },
  _deleteEdge: function(i, j) {
    this._edgesOut[i][j].cleanup();
    delete this._edgesOut[i][j];
    delete this._edgesIn[j][i];
  },
  _replaceSExp: function(sexp) {
    this._state.empty();

    var levels = [];
    var buildGrid = function(exp, level, p) {
      if (level === levels.length) {
        levels.push([]);
      }
      if (SExp.isAtom(exp)) {
        levels[level].push({name: exp, p: p});
      } else {
        levels[level].push({name: SExp.unparse(exp[0]), p: p});
        for (var i = 1; i < exp.length; i++) {
          buildGrid(exp[i], level + 1, levels[level].length - 1);
        }
      }
    };
    buildGrid(sexp, 0, null);

    var gridPadding = 10,
        padding = 2,
        numLevels = levels.length;
    for (var level = 0; level < numLevels; level++) {
      var x = gridPadding;
      for (var pos = 0; pos < levels[level].length; pos++) {
        var node = levels[level][pos];
        node.size = this._getTextSize(node.name);
        node.type = Fist.blockType(node.name);
        node.index = this._state.addNode(
          node.name,
          node.type,
          x,
          (numLevels - level - 1) * 40 + 10 + 0.5,
          node.size.x + 2 * padding,
          node.size.y + 2 * padding
        );
        x += node.size.x + 2 * padding + gridPadding;
        if (node.p !== null) {
          var parentNode = levels[level - 1][node.p];
          this._state.addEdge(node.index, parentNode.index);
        }
      }
    }
  }
});
*/

var Status = new Class({
  initialize: function(statusWrapper) {
    this._statusWrapper = statusWrapper;
    this._messageBox = this._statusWrapper.getElement('#message');
    this._importBox = this._statusWrapper.getElement('#import');
    this._filenameBox = this._statusWrapper.getElement('#filename');
    this._progressBar = this._statusWrapper.getElement('#progress');
  },
  _msg: function(cls, msg) {
    this._statusWrapper.set('class', cls);
    this._messageBox.set('text', msg);
  },
  OK: function(msg) {
    this._msg('ok', msg);
  },
  working: function(msg) {
    this._msg('working', msg);
  },
  notOK: function(err) {
    this._msg('not-ok', err.toString());
  },
  progressStart: function(file, total) {
    this._filenameBox.set('text', file.name);
    this._progressBar.set('value', 0);
    this._progressBar.set('max', total);
    this._importBox.removeClass('hidden');
  },
  progress: function(file, loaded) {
    this._progressBar.set('value', loaded);
  }
});

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
  _step1: function(partialFileData) {
    this._step(1);
    var last = partialFileData.lastIndexOf('\n'),
        lineData = partialFileData.substring(0, last),
        picked = this._pickLines(lineData),
        lines = lineData.split('\n'),
        stepRoot = this._root.getElement('#step1'),
        table = stepRoot.getElement('.table');
    this._lines = lines;
    this._picked = picked;
    var buildLine = function(i, selected) {
      var line = this._lines[i],
          lineNumber = i + 1;
      var rowElem = new Element('div.data-row');
      var cell = Element('div.data-cell')
        .set('text', line)
        .setStyle('width', '99%')
        .toggleClass('odd', lineNumber % 2 === 1)
        .toggleClass('selected', i === selected)
        .addEvent('click', function(evt) {
          table.getElements('.data-cell').removeClass('selected');
          cell.addClass('selected');
          this._picked = {selected: i, limit: i + 10};
        }.bind(this));
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
          .set('text', col)
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
          lowerSuffix = suffix.toLowerCase(),
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

var FistUI = {
  _runViewGraph: function(options) {
    options = options || {};
    var rebuild = options.rebuild || true;
    if (rebuild) {
      this._repl.set('text', this._viewGraph.toFistCode());
    }
    var fistExpression = this._repl.get('text');
    console.log(fistExpression);
    if (fistExpression === '') {
      this._status.OK('view graph is empty.');
      return;
    }
    try {
      this._status.working('type-checking view graph...');
      var fistType = Fist.blockType(fistExpression);
      if (fistType === null) {
        // TODO: identify *what* is invalid about it
        this._status.notOK('view graph is invalid!');
        return;
      }
      if (fistType !== 'view') {
        this._status.OK('view graph describes a ' + fistType + ', not a view.');
        return;
      }
      this._status.working('rendering view...');
      Fist.execute(fistExpression);
      this._status.OK('rendered view graph successfully.');
    } catch (e) {
      console.log(e);
      this._status.notOK(e);
    }
  },
  init: function() {
    this._viewTable = {};

    // set up root
    this._root = $('container');
    this._dropOverlay = this._root.getElement('#drop_overlay');
    this._root.addEventListener('dragenter', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this._dropOverlay.addClass('droptarget');
    }.bind(this), false);
    this._dropOverlay.addEventListener('dragover', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      evt.dataTransfer.dropEffect = 'copy';
      this._dropOverlay.addClass('droptarget');
    }.bind(this), false);
    this._dropOverlay.addEventListener('dragleave', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this._dropOverlay.removeClass('droptarget');
    }.bind(this), false);
    this._dropOverlay.addEventListener('drop', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this._dropOverlay.removeClass('droptarget');
      this._importDialog.show(evt.dataTransfer.files[0]);
    }.bind(this), false);

    this._dragBlock = null;

    // set up status area
    this._status = new Status(this._root.getElement('#status_wrapper'));

    // set up import dialog
    this._importDialog = new ImportDialog($('modal'), this._status);

    // set up palette
    this._palette = this._root.getElement('#palette');

    // set up viewer
    this._viewer = this._root.getElement('#viewer');
    this._content = this._root.getElement('#content');
    this._svgExecuteWrapper = this._root.getElement('#svg_execute_wrapper');
    this._viewExecuteSVG = d3.select(this._svgExecuteWrapper)
      .append('svg:svg')
      .attr('id', 'view_execute')
      .attr('width', this._svgExecuteWrapper.getWidth() - 2)
      .attr('height', this._svgExecuteWrapper.getHeight() - 2);
    $d3(this._viewExecuteSVG).addEvent('sexpreplaced', function(sexp) {
      this._viewGraph.fromFistCode(sexp);
    }.bind(this));

    // set up interpreter
    this._svgGraphWrapper = this._root.getElement('#svg_graph_wrapper');
    this._viewGraphSVG = d3.select(this._svgGraphWrapper)
      .append('svg:svg')
      .attr('id', 'view_graph')
      .attr('width', this._svgGraphWrapper.getWidth() - 2)
      .attr('height', this._svgGraphWrapper.getHeight() - 2)
      .on('dblclick', function(d) {
        var name = window.prompt('enter node name:');
        if (name === null || name.length === 0) {
          return;
        }
        var svgPosition = $d3(this._viewGraph._svg).getPosition(),
            x = d3.event.pageX - svgPosition.x,
            y = d3.event.pageY - svgPosition.y;
        this._viewGraph.addNode(name, {x: x, y: y});
      }.bind(this));
    this._svgGraphWrapper.addEventListener('dragenter', function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      this.addClass('droptarget');
    }, false);
    this._svgGraphWrapper.addEventListener('dragover', function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      evt.dataTransfer.dropEffect = 'move';
      this.addClass('droptarget');
      return false;
    }, false);
    this._svgGraphWrapper.addEventListener('dragleave', function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      this.removeClass('droptarget');
    }, false);
    this._svgGraphWrapper.addEventListener('drop', function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      var json = JSON.parse(evt.dataTransfer.getData('application/json'));
      var svgPosition = this._svgGraphWrapper.getPosition(),
          x = evt.pageX - svgPosition.x,
          y = evt.pageY - svgPosition.y;
      this._viewGraph.addNode(json.name, {x: x, y: y});
    }.bind(this), false);

    this._repl = this._root.getElement('#repl');
    this._viewGraph = new ViewGraph(this._viewGraphSVG);

    // register event listeners for Fist events
    Fist.listen('symbolimport', function(name, value, moduleName) {
      this.onSymbolImport(name, moduleName);
    }.bind(this));
    Fist.listen('moduleimport', function(moduleName) {
      this.onModuleImport(moduleName);
    }.bind(this));
    Fist.listen('viewinvoked', function(name, args) {
      this.onViewInvoked(name, args);
    }.bind(this));
  },
  onSymbolImport: function(name, moduleName) {
    var type = Fist.blockType(name),
        sexp = SExp.parse(type);
    var block = Element('div.block.' + type, {
      text: name,
      draggable: true,
    });
    block.tips = new Tips(block, {
      className: 'fistdocs',
      title: 'text',
      text: function(element) {
        if (type === 'function' || type === 'channel') {
          var value = Fist.evaluateAtom(element.get('text'));
          if (value.describe === undefined) {
            return type;
          }
          return value.describe();
        } else {
          return type;
        }
      }.bind(this)
    });
    block.addEventListener('dragstart', function(evt) {
      block.addClass('dragtarget');
      block.tips.fireEvent('hide');
      evt.dataTransfer.effectAllowed = 'move';
      evt.dataTransfer.setData('application/json', JSON.stringify({
        name: name,
        type: type,
      }));
      this._dragBlock = block;
    }.bind(this), false);
    block.addEventListener('dragend', function(evt) {
      this._dragBlock = null;
      block.removeClass('dragtarget');
      this._svgGraphWrapper.removeClass('droptarget');
    }.bind(this), false);
    if (moduleName === undefined) {
      block.inject(this._palette, 'top');
      this._palette.scrollTo(0, 0);
    } else {
      var moduleGroup = this._palette.getElement(
        'div.module-group[name=' + moduleName + ']'
      );
      moduleGroup.getElement('div.module-contents').adopt(block);
    }
  },
  onModuleImport: function(moduleName) {
    var moduleGroup = new Element('div.module-group', {
          name: moduleName
        }),
        moduleContents = new Element('div.module-contents.hidden'),
        moduleHeader = new Element('div.module-name', {
          text: moduleName + ' \u25b8'
        });
    // HACK: keep Views open
    if (moduleName === 'Views') {
      moduleHeader.set('text', moduleName + ' \u25be');
      moduleContents.removeClass('hidden');
    }
    moduleHeader.addEvent('click', function(evt) {
      if (moduleContents.hasClass('hidden')) {
        this.set('text', moduleName + ' \u25be');
        moduleContents.removeClass('hidden');
      } else {
        this.set('text', moduleName + ' \u25b8');
        moduleContents.addClass('hidden');
      }
    });
    moduleGroup.adopt(moduleHeader, moduleContents).inject(this._palette);
  },
  onViewInvoked: function(name, args) {
    console.log('rendering view ' + name);
    $d3(this._viewExecuteSVG).empty();
    var view = this._viewTable[name];
    if (view === undefined) {
      throw new Error('unrecognized view: ' + name);
    }
    view.render(this._viewExecuteSVG, args);
  },
  importView: function(name, view) {
    console.log('importing view ' + name);
    this._viewTable[name] = view;
  },
  dynamicResize: function() {
    var contentSize = this._content.getSize();
    this._svgExecuteWrapper
      .setStyle('width', contentSize.x - 8)
      .setStyle('height', contentSize.y - 8);
    this._viewExecuteSVG
      .attr('width', this._svgExecuteWrapper.getWidth() - 2)
      .attr('height', this._svgExecuteWrapper.getHeight() - 2)
    try {
      this._runViewGraph({rebuild: false});
    } catch (e) {
      console.log(e);
    }
  },
  loaded: function(version, loadStart) {
    var loadTime = +(new Date()) - loadStart,
        msg = 'datafist version ' + version + ': loaded in ' + loadTime + ' ms';
    this._status.OK(msg);
  }
};
