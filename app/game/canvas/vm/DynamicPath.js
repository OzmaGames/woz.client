define(['api/datacontext', './Box', './Path', './confirm-box', 'paper'], function (ctx, Box, Path, ConfirmBox) {

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

  var confirmBox;
  //var confirmBoxActivator = activator.create(), confirmBox = new ConfirlmBox();
  //confirmBoxActivator.activateItem(confirmBox).then(function () { confirmBox.show();});

  function DynamicPath(paperScope, pathModel) {
    var base = this;

    confirmBox = new ConfirmBox(scope = paperScope);
    confirmBox.events.mousedown = function () {
      confirmBox.hide();
      Box.options.animate = true;
      base.pathModel.phrase._complete(true);
      base.pathModel.phrase.words.valueHasMutated();
      Box.options.animate = false;
    };

    this.pathModel = pathModel;
    this.activeWord = null;

    this.events = {
      mouseenter: function (e) {
        if (activeWord() != null) {
          var arr = base.pathModel.guiBoxes, word = activeWord();
          for (var i = 0; i < arr.length; i++) {
            arr[i].enter(word);
          }
          activePath = base;
          base.activeWord = word;
        }
      },
      mouseleave: function (e) {
        if (activePath == base) {
          var arr = base.pathModel.guiBoxes;
          for (var i = 0; i < arr.length; i++) {
            arr[i].leave();
          }
          activePath = null;
          base.activeWord = null;
        }
      }
    };

    this.events.mousedown = function (e) {
      if (base.activeWord != null) {
        base.pathModel.addWord(base.activeWord);
        base.events.mouseleave(e);
      }
    }

    this.drop = function () { base.events.mousedown(); }

    this.draw = this.show;
  }

  DynamicPath.prototype = new Path();
  DynamicPath.prototype.constructor = DynamicPath;

  DynamicPath.prototype.show = function () {
    console.log('%cDynamic Path', 'background: orange; color: white', this.pathModel.id + ' is being drawn');

    var pm = this.pathModel, nWords = 7;

    //debugger;
    if (pm.phrase.complete() === true) {
      nWords = pm.phrase.words().length;
      this._hideCircles();
    } else {
      this._showCircles();
    }

    this._cleanCycle();

    var desiredLength = Path.getDesiredLength(pm.guiBoxes, nWords);
    path = Path.getBestArc(pm.startTile.center, pm.endTile.center, desiredLength, pm.cw, nWords * 3 / 2);
    this.cPoint = Path.cPoint;

    var delta = path.length - desiredLength,
        visibleLength = path.length - 2 * (Path.options.tileMargin + Path.options.tileRadius),
        startPoint = Path.options.tileRadius + Path.options.tileMargin,
        offset = startPoint;

    var hover = new scope.Path();
    hover.add(pm.startTile.center);

    for (var i = 0; i < nWords; i++) {
      var box = pm.guiBoxes[i],
        half = box.width() / 2 + Path.options.rectMargin + delta / (2 * nWords);

      offset += half;
      var point = path.getPointAt(offset),
         normal = path.getNormalAt(offset).normalize(Path.options.hoverMargin / 2);

      hover.add(point.subtract(normal));
      hover.insert(0, point.add(normal));

      offset += half;

      box.cPoint = point;
      box.angle = normal.angle + 90;
      box.scale = delta >= 0 ? 1 : path.length / desiredLength;
      box.show();
    }

    hover.on(this.events);
    hover.fillColor = new scope.Color(0, 0);
    hover.add(pm.endTile.center);
    hover.closePath();
    this._trash.push(hover);

    if (pm.phrase.words().length >= 3 && !pm.phrase.complete())
      confirmBox.show(path, pm.guiBoxes);
    else
      confirmBox.hide();

    if (!Path.options.debug) {
      path.remove();
    } else {
      hover.strokeColor = 'lightgreen';
      this._trash.push(path);
    }

    scope.view.draw();
  };

  DynamicPath.prototype._hideCircles = function () {
    for (var i = 0; i < this.pathModel.guiBoxes.length; i++) {
      this.pathModel.guiBoxes[i].hideIfEmpty();
    }
  }
  DynamicPath.prototype._showCircles = function () {
    for (var i = 0; i < this.pathModel.guiBoxes.length; i++) {
      this.pathModel.guiBoxes[i].showIfEmpty();
    }
  }

  return DynamicPath;
});