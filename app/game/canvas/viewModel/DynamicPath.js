define(['api/datacontext', 'game/canvas/viewModel/Box', 'game/canvas/viewModel/Path', 'paper'], function (ctx, Box, Path) {

  var scope = paper;
  var activeWord = ctx.activeWord;
  var activeWords = ctx.activeWords;
  var transparent = new scope.Color(0, 0);

  var activePath = null;
  activeWord.subscribe(function (word) {
    if (word == null && activePath != null) {
      activePath.drop();
    }
  });

  function DynamicPath(paperScope, pathModel) {
    scope = paperScope;
    //this.options = $.extend(true, {}, Path.options, opt);
    this.pathModel = pathModel;

    this.activeWord = null;
    var base = this;

    this.events = {
      mouseenter: function (e) {
        if (activeWord() != null) {
          activePath = base;
          base.activeWord = activeWord();
          base.pathModel.guiBoxes.group.style = DynamicPath.options.circle.activeStyle;
        }
      },
      mouseleave: function (e) {
        if (activePath == base) {
          base.pathModel.guiBoxes.group.style = DynamicPath.options.circle.style;
          activePath = null;
          base.activeWord = null;
        }
      },
      mousedown: function (e) {
        if (base.activeWord != null) {
          base.pathModel.guiBoxes.group.style = DynamicPath.options.circle.style;
          base.pathModel.addWord(base.activeWord);
        }
      }
    };

    this.draw = this.show;
  }

  DynamicPath.prototype = new Path();
  DynamicPath.prototype.constructor = DynamicPath;

  DynamicPath.prototype.drop = function () { this.events.mousedown(); }

  DynamicPath.prototype.show = function () {
    console.log('%cDynamic Path', 'background: orange; color: white', this.pathModel.id + ' is being drawn');
    var pm = this.pathModel, nWords = 7;
    if (pm.phrase.complete()) nWords = pm.phrase.words().length;

    if (this._hasSetuped) {
      for (var i = 0; i < this._hoverItems.length; i++) {
        this._hoverItems[i].remove();
      }
    } else {
      pm.guiBoxes = [];
      pm.guiBoxes.group = new scope.Group();
    }

    for (var i = 0; i < nWords; i++) {
      if (pm.hasWordAt(i) && (pm.guiBoxes[i] == undefined || pm.guiBoxes[i] instanceof Circle)) {
        var circle = pm.guiBoxes[i];
        pm.guiBoxes[i] = new Box(scope, i, pm, [-100, -100], 0);
        if (circle) {
          circle.remove();
          pm.guiBoxes.group.removeChildren(circle.circle);
        }
      } else if (!pm.hasWordAt(i) && (pm.guiBoxes[i] == undefined || pm.guiBoxes[i] instanceof Box)) {
        var box = pm.guiBoxes[i],
          circle = pm.guiBoxes[i] = new Circle([-100, -100]);
        this._displayItems.push(circle);
        pm.guiBoxes.group.addChild(circle.circle);
        if (box) box.remove();
      }
    }

    var desiredLength = Path.getDesiredLength(nWords, pm.guiBoxes);
    path = Path.shortestArc(pm.startTile.center, pm.endTile.center, desiredLength, pm.cw);
    path.strokeColor = 'grey';
    this._displayItems.push(path);

    var delta = path.length - desiredLength,
        visibleLength = path.length - 2 * (Path.options.tileMargin + Path.options.tileRadius),
        startPoint = Path.options.tileRadius + Path.options.tileMargin + delta / (2 * nWords),
        offset = startPoint;

    var hover = new scope.Path();
    hover.add(pm.startTile.center);

    for (var i = 0; i < nWords; i++) {
      var item = pm.guiBoxes[i];
      offset += item.width() / 2 + Path.options.rectMargin + delta / (2 * nWords);

      var point = path.getPointAt(offset),
         normal = path.getNormalAt(offset).normalize(DynamicPath.options.hoverMargin / 2);

      if (item instanceof Circle) {
        item.cPoint = point;
        item.show();
      } else {
        item.cPoint = point;
        item.angle = normal.angle + 90;
        item.setPath(pm);
      }

      hover.add(point.subtract(normal));
      hover.insert(0, point.add(normal));

      offset += item.width() / 2 + Path.options.rectMargin + delta / (2 * nWords);
    }

    hover.on(this.events);

    if (pm.phrase.words().length >= 3 && !pm.phrase.complete())
      this.showDone(path, pm.guiBoxes);

    if (Path.options.debug) hover.strokeColor = 'lightgreen'
    if (!Path.options.debug) path.remove();
    hover.fillColor = new scope.Color(0, 0);
    hover.add(pm.endTile.center);
    hover.closePath();

    this._hoverItems.push(hover);

    this._hasSetuped = true;
    scope.view.draw();
  };

  DynamicPath.prototype.showDone = function (path, boxes) {
    var box;
    for (var i = 0; i < boxes.length; i++) {
      if (!boxes[i].hasData) break;
      box = boxes[i];
    }

    var cPoint = box.cPoint.add(path.getNormalAt(path.length / 2).normalize(-60)).add([50, 0]);
    var rect = this.createDoneContainer();
    var group = this.createDoneButton2(new scope.Point(0, 0));
    rect.position = cPoint;
    group.position = cPoint.add([0, 15]);

    var text = new scope.PointText({
      point: cPoint.add([0,-15]),
      content: "Are you done?"
    });
    text.style = Path.Box.options.textStyle;
    text.fontSize = 12;
    text.fillColor = "black";

    //rect.rotate(box.angle, cPoint);
    //group.rotate(box.angle, cPoint);
    //text.rotate(box.angle, cPoint);


    this._hoverItems.push(text);
  }

  DynamicPath.prototype.createDoneContainer = function () {
    var size = new scope.Point(60, 40);
    var rect = new scope.Path.Rectangle(size.negate(), size);

    this._hoverItems.push(rect);
    
    rect.style = {
      fillColor: "white",
      strokeColor: "#e8e0d3",
      shadowColor: '#b8b0a3',
      shadowBlur: 5,
      shadowOffset: new scope.Point(1, 1)
    }
    rect.bringToFront();

    return rect;
  }

  DynamicPath.prototype.showDoneCenter = function (path) {
    var margin = 50;
    var offset = path.length / 2;
    var normal = path.getNormalAt(offset).normalize(margin);
    var cPoint = path.getPointAt(offset).add(normal);
    var group = this.createDoneButton(cPoint);
    group.rotate(path.getTangentAt(offset).angle, cPoint);
  }

  DynamicPath.prototype.createDoneButton2 = function (cPoint) {
    var group = new scope.Group();
    var size = new scope.Point(30, 15);
    var base = this;

    var button = new scope.Path.Rectangle(cPoint.subtract(size), cPoint.add(size));
    button.strokeColor = "#e8e0d3";
    button.fillColor = "orange";
    button.strokeWidth = 2;    

    var text = new scope.PointText({
      point: cPoint,
      content: "Done"
    });
    text.style = Path.Box.options.textStyle;
    text.fillColor = "white";
    text.position.y += 4;

    text.characterStyle.fontStyle = 'bold';

    group.addChild(button);
    button = button.clone();
    group.addChild(button);
    group.addChild(text);

    button.fillColor = new scope.Color(0, 0);
    button.bringToFront();
    button.on({
      mouseenter: function () {
        this.style = {
          shadowColor: '#b8b0a3',
          shadowBlur: 3,
          shadowOffset: new scope.Point(0, 0)
        }
      },
      mouseleave: function () {
        this.style = {
          shadowBlur: 0
        }
      },
      mousedown: function () {
        base.clear();
        base.pathModel.phrase._complete(true);
        base.pathModel.phrase.words.valueHasMutated();
      }
    });

    this._hoverItems.push(group);


    return group;
  }

  DynamicPath.prototype.createDoneButton = function (cPoint) {
    var group = new scope.Group();
    var size = new scope.Point(30, 15);
    var base = this;

    var button = new scope.Path.Rectangle(cPoint.subtract(size), cPoint.add(size));
    button.strokeColor = "#e8e0d3";
    button.fillColor = "white";
    button.strokeWidth = 2;
    button.smooth();

    var text = new scope.PointText({
      point: cPoint,
      content: "Done"
    });
    text.style = Path.Box.options.textStyle;
    text.position.y += 4;

    text.characterStyle.fontStyle = 'bold';

    group.addChild(button);

    button = button.clone();
    button.fillColor = new scope.Color(0, 0);
    button.bringToFront();
    button.on({
      mouseenter: function () {
        this.style = {
          shadowColor: '#b8b0a3',
          shadowBlur: 3,
          shadowOffset: new scope.Point(0, 0)
        }
      },
      mouseleave: function () {
        this.style = {
          shadowBlur: 0
        }
      },
      mousedown: function () {
        base.clear();
        base.pathModel.phrase._complete(true);
        base.pathModel.phrase.words.valueHasMutated();
      }
    });

    group.addChild(button);
    group.addChild(text);
    this._hoverItems.push(group);


    return group;
  }

  function Circle(cPoint) {
    this.cPoint = cPoint;
    this.circle = new scope.Path.Circle(cPoint, DynamicPath.options.circle.radius);

    this.circle.style = DynamicPath.options.circle.style;

    this.show = function () {
      this.circle.position = this.cPoint;
    }

    this.width = function () {
      return DynamicPath.options.circle.width;
    }

    this.active = function () {
      this.circle.style = DynamicPath.options.circle.activeStyle;
    }

    this.deactive = function () {
      this.circle.style = DynamicPath.options.circle.style;
    }

    this.remove = function () {
      this.circle.remove();
    }
  }


  DynamicPath.options = {
    circle: {
      radius: 8,
      margin: 16,
      width: 23,
      style: {
        fillColor: '#CBB28F',
        shadowBlur: 0,
        strokeWidth: 0
      },
      activeStyle: {
        strokeWidth: 2,
        strokeColor: '#CBB28F',
        shadowBlur: 20,
        shadowColor: '#CBB28F',
        shadowOffset: new scope.Point(0, 0)
      }
    },
    hoverMargin: 120
  }

  return DynamicPath;
});