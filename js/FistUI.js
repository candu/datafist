'use strict';

var SVGUtils = {
  translate: function(pos) {
    return 'translate(' + pos.x + ', ' + pos.y + ')';
  },
  translateToHide: function() {
    return 'translate(-1000, -1000)';
  }
};

var HitArea = new Class({
  initialize: function(graph, blockGroup, node, type, id, variadic) {
    this.node = node;
    this.type = type;
    this.id = id;
    this.variadic = variadic || false;

    this.pos = {
      x: id * (HitArea.WIDTH + HitArea.PADDING)
    };
    switch (type) {
      case HitArea.INPUT:
        this.pos.y = -HitArea.HEIGHT;
        break;
      case HitArea.OUTPUT:
        this.pos.y = node.dims.h;
        break;
    }

    var hitParts = ['hit', node.id, type, id];
    this._hit = blockGroup.append('svg:rect')
      .attr('class', 'hit output')
      .attr('id', hitParts.join('_'))
      .attr('x', this.pos.x)
      .attr('y', this.pos.y)
      .attr('width', HitArea.WIDTH)
      .attr('height', HitArea.HEIGHT)
      .on('mouseover', function() {
        this._hit.attr('class', 'hit output hover');
      }.bind(this))
      .on('mouseout', function() {
        this._hit.attr('class', 'hit output');
      }.bind(this));

    if (this.type === HitArea.OUTPUT) {
      this._hit.call(HitArea._edgeCreateBehavior(graph, this));
    }
  },
  getEdgePos: function() {
    return {
      x: this.node.dims.x + this.pos.x + HitArea.WIDTH / 2,
      y: this.node.dims.y + this.pos.y + HitArea.HEIGHT / 2
    };
  },
  isFull: function() {
    return this.type === HitArea.INPUT &&
           this.node.edgeIn(this.id) !== undefined;
  },
  cleanup: function() {
    this._hit.remove();
  }
});
HitArea.INPUT = 'I';
HitArea.OUTPUT = 'O';
HitArea.WIDTH = 12;
HitArea.HEIGHT = 5;
HitArea.PADDING = 4;
HitArea.fromElement = function(graph, elem) {
  var hitParts = elem.id.split('_');
  if (hitParts.length !== 4) {
    return undefined;
  }
  var hit = hitParts[0],
      nodeID = hitParts[1],
      type = hitParts[2],
      id = hitParts[3];
  if (hit !== 'hit') {
    return undefined;
  }
  var node = graph._nodes[nodeID];
  if (node === undefined) {
    return undefined;
  }
  switch (type) {
    case HitArea.INPUT:
      return node.inputs[id];
    case HitArea.OUTPUT:
      return node.outputs[id];
    default:
      return undefined;
  }
};
HitArea._edgeCreateBehavior = function(graph, output) {
  return d3.behavior.drag()
    .on('dragstart', function() {
      d3.event.sourceEvent.stopPropagation();
      var outputPos = output.getEdgePos();
      graph._tempEdgeGroup
        .attr('transform', SVGUtils.translate(outputPos));
      graph._tempEdgeEnd.x = 0;
      graph._tempEdgeEnd.y = 0;
      graph._tempEdge
        .attr('x2', graph._tempEdgeEnd.x)
        .attr('y2', graph._tempEdgeEnd.y);
    })
    .on('dragend', function(d) {
      d3.event.sourceEvent.stopPropagation();
      graph._tempEdgeGroup
        .attr('transform', SVGUtils.translateToHide());
      var target = d3.event.sourceEvent.target,
          input = HitArea.fromElement(graph, target);
      if (input === undefined || input.type !== HitArea.INPUT) {
        console.log('skipping, invalid elem target');
        return;
      }
      graph.addEdge(output, input);
    })
    .on('drag', function(d) {
      graph._tempEdgeEnd.x += d3.event.dx;
      graph._tempEdgeEnd.y += d3.event.dy;
      graph._tempEdge
        .attr('x2', graph._tempEdgeEnd.x)
        .attr('y2', graph._tempEdgeEnd.y);
    });
};

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
      .attr('transform', SVGUtils.translate(this.dims))
      .on('dblclick', function() {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        var name = window.prompt('edit node name:', this.name);
        if (!name || name === this.name) {
          return;
        }
        graph.replaceNode(this, name, this.dims);
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

    this.inputs = [];
    if (this.type === 'function') {
      var params = this._getFunctionParams();
      params.each(function(param, i) {
        this.inputs.push(new HitArea(graph, this._g, this, HitArea.INPUT, i, param.variadic));
      }.bind(this));
    }
    this.outputs = [];
    if (this.type === 'function') {
      var value = Fist.evaluateAtom(this.name),
          fnType = SExp.parse(value.type());
      if (fnType[2] !== 'view') {
        this.outputs.push(new HitArea(graph, this._g, this, HitArea.OUTPUT, 0));
      }
    } else {
      this.outputs.push(new HitArea(graph, this._g, this, HitArea.OUTPUT, 0));
    }
  },
  addVariadicInput: function(graph) {
    this.inputs.push(new HitArea(graph, this._g, this, HitArea.INPUT, this.inputs.length, true));
  },
  _getFunctionParams: function() {
    var variadicity = function(type) {
      if (SExp.isAtom(type)) {
        switch (type) {
          case 'channel?':
          case 'time':
          case 'timedelta':
          case 'number':
          case 'string':
          case 'channel':
          case 'view':
            return false;
          default:
            throw new Error('unrecognized atomic type: ' + type);
        }
      }
      switch (type[0]) {
        case 'name':
          var subType = type[1],
              name = Fist.evaluateAtom(type[2]);
          return {name: name, variadic: variadicity(subType)};
        case '->':
          var thenType = [];
          for (var j = 1; j < type.length; j++) {
            thenType.push(variadicity(type[j]));
          }
          return thenType;
        case '|':
          var isVariadic = false;
          for (var j = 1; j < type.length; j++) {
            if (variadicity(type[j])) {
              isVariadic = true;
              break;
            }
          }
          return isVariadic;
        case '?':
          return variadicity(type[1]);
        case '+':
          return true;
        case 'fn':
          return false;
        default:
          throw new Error('unrecognized param type operator: ' + type[0]);
      }
    };
    var value = Fist.evaluateAtom(this.name),
        fnType = SExp.parse(value.type()),
        params = variadicity(fnType[1]);
    if (!(params instanceof Array)) {
      params = [params];
    }
    return params;
  },
  move: function(dx, dy) {
    this.dims.x += dx;
    this.dims.y += dy;
    this._g
      .attr('transform', SVGUtils.translate(this.dims));
    this.allEdges().each(function(edge) {
      edge.update();
    });
    return this;
  },
  addEdge: function(edge) {
    if (edge.input.node === this) {
      this._edgesIn[edge.input.id] = edge;
    } else if (edge.output.node === this) {
      if (this._edgesOut[edge.output.id] === undefined) {
        this._edgesOut[edge.output.id] = [];
      }
      this._edgesOut[edge.output.id].push(edge);
    }
    return this;
  },
  deleteEdge: function(edge) {
    if (edge.input.node === this) {
      delete this._edgesIn[edge.input.id];
      if (edge.input.variadic) {
        var n = this.inputs.length;
        for (var i = edge.input.id + 1; i < n - 1; i++) {
          var nextEdge = this._edgesIn[i];
          if (nextEdge !== undefined) {
            delete this._edgesIn[i];
            this._edgesIn[i - 1] = nextEdge;
            nextEdge.input = this.inputs[i - 1];
            nextEdge.update();
          }
        }
        if (n > 1 && this.inputs[n - 2].variadic) {
          var input = this.inputs.pop();
          input.cleanup();
        }
      }
    } else if (edge.output.node === this) {
      this._edgesOut[edge.output.id].erase(edge);
    }
    return this;
  },
  cleanup: function() {
    this._g.remove();
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
  visited[fromNode.id] = true;
  if (fromNode === toNode) {
    return true;
  }
  var edges = fromNode.allEdgesOut();
  for (var i = 0; i < edges.length; i++) {
    var nextNode = edges[i].input.node;
    if (visited[nextNode.id]) {
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
  initialize: function(graph, edgeGroup, output, input) {
    this.output = output;
    this.input = input;

    this._line = edgeGroup.append('svg:line')
      .attr('class', 'edge')
      .attr('marker-end', 'url(#edge_end)')
      .call(Edge._dragBehavior(graph, this));
    this.update();
  },
  update: function() {
    var outputPos = this.output.getEdgePos(),
        inputPos = this.input.getEdgePos();
    this._line
      .attr('x1', outputPos.x)
      .attr('y1', outputPos.y)
      .attr('x2', inputPos.x)
      .attr('y2', inputPos.y);
  },
  cleanup: function() {
    this._line.remove();
  }
});
Edge._dragBehavior = function(graph, edge) {
  var drag = function() {
    var origin = graph.getOrigin(),
        x = d3.event.sourceEvent.pageX - origin.x,
        y = d3.event.sourceEvent.pageY - origin.y;
    edge._line
      .attr('class', 'edge temp')
      .attr('x2', x)
      .attr('y2', y);
  };
  return d3.behavior.drag()
    .on('dragstart', drag)
    .on('drag', drag)
    .on('dragend', function() {
      var target = d3.event.sourceEvent.target,
          input = HitArea.fromElement(graph, target),
          output = edge.output;
      graph.deleteEdge(edge);
      if (input !== undefined && input.type === HitArea.INPUT) {
        graph.addEdge(output, input);
      }
    });
};

var ViewGraph = new Class({
  initialize: function(svg) {
    this._svg = svg;
    this._nextNodeID = 0;
    this._nodes = {};

    this._edgeGroup = this._svg.append('svg:g');

    this._tempEdgeGroup = svg.append('svg:g')
      .attr('transform', SVGUtils.translateToHide());
    this._tempEdgeEnd = {};
    this._tempEdge = this._tempEdgeGroup.append('svg:line')
      .attr('class', 'edge temp')
      .attr('marker-end', 'url(#edge_end)')
      .attr('x1', 0)
      .attr('y1', 0);

    this._tempTextGroup = svg.append('svg:g')
      .attr('transform', SVGUtils.translateToHide());
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
  // NOTE: the _*Impl() versions exist to allow, e.g., fromSExp() to issue
  // a bunch of graph operations without constantly calling
  // FistUI.runViewGraph() :)
  _addNodeImpl: function(name, pos) {
    var id = this._nextNodeID++;
    this._nodes[id] = new Node(this, this._nodeGroup, name, pos, id);
    return this._nodes[id];
  },
  addNode: function(name, pos) {
    var node = this._addNodeImpl(name, pos);
    FistUI.runViewGraph();
    return node;
  },
  _addEdgeImpl: function(output, input) {
    if (Node.existsPath(input.node, output.node)) {
      console.log('skipping, will create cycle!');
      return null;
    }
    if (input.isFull()) {
      console.log('skipping, input is already being used!');
      return null;
    }
    var edge = new Edge(this, this._edgeGroup, output, input);
    output.node.addEdge(edge);
    input.node.addEdge(edge);
    if (input.variadic && input.id === input.node.inputs.length - 1) {
      input.node.addVariadicInput(this);
    }
    return edge;
  },
  addEdge: function(output, input) {
    var edge = this._addEdgeImpl(output, input);
    FistUI.runViewGraph();
    return edge;
  },
  _deleteNodeImpl: function(node) {
    node.allEdges().each(function(edge) {
      this._deleteEdgeImpl(edge);
    }.bind(this));
    node.cleanup();
    delete this._nodes[node.id];
    // TODO: connect in/out neighbors to help with filter cleanup?
  },
  deleteNode: function(node) {
    this._deleteNodeImpl(node);
    FistUI.runViewGraph();
  },
  _deleteEdgeImpl: function(edge) {
    edge.cleanup();
    edge.input.node.deleteEdge(edge);
    edge.output.node.deleteEdge(edge);
  },
  deleteEdge: function(edge) {
    this._deleteEdgeImpl(edge);
    FistUI.runViewGraph();
  },
  _replaceNodeImpl: function(node, name, pos) {
    var newNode = this._addNodeImpl(name, pos);
    node.allEdgesIn().each(function(edge) {
      this._deleteEdgeImpl(edge);
      if (edge.input.id < newNode.inputs.length) {
        this._addEdgeImpl(edge.output, newNode.inputs[edge.input.id]);
      }
    }.bind(this));
    node.allEdgesOut().each(function(edge) {
      this._deleteEdgeImpl(edge);
      if (edge.output.id < newNode.outputs.length) {
        this._addEdgeImpl(newNode.outputs[edge.output.id], edge.input);
      }
    }.bind(this));
    this._deleteNodeImpl(node);
  },
  replaceNode: function(node, name, pos) {
    this._replaceNodeImpl(node, name, pos);
    FistUI.runViewGraph();
  },
  _emptyImpl: function() {
    Object.values(this._nodes).each(function(node) {
      this._deleteNodeImpl(node);
    }.bind(this));
  },
  empty: function() {
    FistUI.runViewGraph();
  },
  _depthSExp: function(node) {
    var S = node.allEdgesIn().map(function(edge) {
      return edge.output.node;
    });
    if (S.length === 0) {
      return node.name;
    }
    return [node.name].append(S.map(this._depthSExp.bind(this)));
  },
  toSExps: function() {
    var T = Object.values(this._nodes).filter(function(node) {
      return node.allEdgesOut().length === 0;
    });
    return T.map(this._depthSExp.bind(this));
  },
  toFistCode: function() {
    return this.toSExps().map(SExp.unparse.bind(SExp)).join(' ');
  },
  _buildGrid: function(sexp, level, parent, input, grid) {
    if (SExp.isAtom(sexp)) {
      grid.push({name: sexp, level: level, parent: parent, input: input});
      return;
    }
    this._buildGrid(sexp[0], level, parent, input, grid);
    var last = grid.length - 1;
    for (var i = 1; i < sexp.length; i++) {
      this._buildGrid(sexp[i], level + 1, last, i - 1, grid);
    }
  },
  fromSExp: function(sexp) {
    var grid = [];
    this._buildGrid(sexp, 0, null, null, grid);
    var gridPadding = 20,
        depth = d3.max(grid, function(item) { return item.level; }),
        xs = {};
    this._emptyImpl();
    grid.each(function(item) {
      item.id = this._nextNodeID;
      var x = xs[item.level] || gridPadding,
          y = (depth - item.level) * 40 + gridPadding + 0.5;
      this._addNodeImpl(item.name, {x: x, y: y});
      var node = this._nodes[item.id];
      node.move(Math.floor(node.dims.w / 2), Math.floor(node.dims.h / 2));
      xs[item.level] = x + (node.dims.w + gridPadding);
      if (item.parent !== null && item.input !== null) {
        var output = node.outputs[0],
            parentItem = grid[item.parent],
            parentNode = this._nodes[parentItem.id],
            input = parentNode.inputs[item.input];
        this._addEdgeImpl(output, input);
      }
    }.bind(this));
    FistUI.runViewGraph();
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
  },
  getOrigin: function() {
    return $d3(this._svg).getPosition();
  }
});

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

var FistUI = {
  _viewTable: {},
  _fistCode: '',
  inited: false,
  runViewGraph: function(options) {
    options = options || {};
    var rebuild = options.rebuild || true;
    if (rebuild) {
      this._fistCode = this._viewGraph.toFistCode();
    }
    console.log(this._fistCode);
    if (this._fistCode === '') {
      this._status.OK('view graph is empty.');
      return;
    }
    try {
      this._status.working('type-checking view graph...');
      var fistType = Fist.blockType(this._fistCode);
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
      Fist.execute(this._fistCode);
      this._status.OK('rendered view graph successfully.');
    } catch (e) {
      console.log(e);
      this._status.notOK(e);
    }
  },
  init: function() {
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
      this._viewGraph.fromSExp(sexp);
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

    this.inited = true;
  },
  onSymbolImport: function(name, value, moduleName) {
    console.log('importing symbol ' + name + ' in module ' + moduleName);
    var type = Fist.blockType(name),
        sexp = SExp.parse(type);
    this._palette.getElements('div.block[name=' + name + ']').destroy();
    var block = new Element('div.block.' + type, {
      text: name,
      name: name,
      draggable: true,
    });
    block.tips = new Tips(block, {
      className: 'fistdocs',
      title: 'text',
      text: function(element) {
        if (type === 'function' || type === 'channel') {
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
    console.log('importing module ' + moduleName);
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
      this.runViewGraph({rebuild: false});
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
