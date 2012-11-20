var ViewNode = new Class({
  initialize: function(name, x, y) {
    this._name = name;
    this._x = x;
    this._y = y;
  },
});
ViewNode.fromElement = function(elem) {
  return new ViewNode(
    elem.get('text'),
    parseInt(elem.style.left),
    parseInt(elem.style.top)
  );
};

var ViewGraph = new Class({
  initialize: function() {
    this._nextNodeId = 0;
    this._nodes = {};
    // mapping from nodes to all outgoing edges
    this._edgesOut = {};
    // mapping from nodes to all incoming edges
    this._edgesIn = {};
  },
  addNode: function(node) {
    var i = this._nextNodeId++;
    this._nodes[i] = node;
    this._edgesOut[i] = {};
    this._edgesIn[i] = {};
    return i;
  },
  deleteNode: function(i) {
    delete this._edgesOut[i];
    for (var j in this._edgesOut) {
      delete this._edgesOut[j][i];
    }
    delete this._edgesIn[i];
    for (var j in this._edgesIn) {
      delete this._edgesIn[j][i];
    }
    delete this._nodes[i];
  },
  addEdge: function(i, j) {
    // add directed edge from i to j
    this._edgesOut[i][j] = true;
    this._edgesIn[j][i] = true;
  },
  toJSON: function() {
    var nodes = {};
    for (var i in this._nodes) {
      nodes[i] = {
        name: this._nodes[i]._name,
        x: this._nodes[i]._x,
        y: this._nodes[i]._y
      }
    }
    return JSON.stringify({
      nodes: nodes,
      edges: this._edgesOut
    });
  },
  /**
   * Produce a representation of this ViewGraph in the fist language.
   */
  toFist: function() {
    var spatialSort = function(indices) {
      indices.sort(function(i, j) {
        var dx = this._nodes[i]._x - this._nodes[j]._x;
        if (dx !== 0) {
          return dx;
        }
        return this._nodes[i]._y - this._nodes[j]._y;
      }.bind(this));
    }.bind(this);
    var depthWalk = function(i) {
      var S = Object.keys(this._edgesIn[i]);
      if (S.length === 0) {
        return this._nodes[i]._name;
      }
      spatialSort(S);
      var sexp = S.map(depthWalk);
      sexp.unshift(this._nodes[i]._name);
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
ViewGraph.fromJSON = function(json) {
  // TODO: implement this
  throw new Error('not implemented yet');
};

var FistUI = new Class({
  initialize: function(fist, root) {
    this._viewTable = {};
    this._fist = fist;
    this._root = root;
    this._viewGraph = new ViewGraph();

    this._dragBlock = null;

    // set up palette
    this._palette = this._root.getElement('#palette');

    // set up viewer
    this._viewer = this._root.getElement('#viewer');
    this._svgWrapper = this._root.getElement('#svg_wrapper');
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
      var block = this._createBlock(name);
      var svgPosition = this._svgWrapper.getPosition();
      var blockSize = this._dragBlock.getSize();
      block.setPosition({
        x: evt.pageX - svgPosition.x - blockSize.x / 2,
        y: evt.pageY - svgPosition.y - blockSize.y / 2
      });
      block.inject(this._svgWrapper);
      this._viewGraph.addNode(ViewNode.fromElement(block));
      this._repl.set('text', this._viewGraph.toFist().join(' '));
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
