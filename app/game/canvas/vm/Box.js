define(['durandal/app', 'api/datacontext', 'paper'], function (app, ctx) {

  var scope = paper;
  var transparent = new scope.Color(0, 0);
  var default_cPoint = new scope.Point(-100, -100);

  function Box(index, pathModel, cPoint, angle) {    
    var base = this;

    base.index = index;
    base.active = false;
    base.cPoint = cPoint || default_cPoint;
    base.angle = angle || 0;
    base.prevAngle = 0;
    base.scale = 1;
    base.prevScale = 1;

    base.isCircle = false;
    base.isButton = false;

    base._guiRect = null;
    base._guiText = null;
    base._guiElem = null;

    base.pathModel = base.wordModel = base.hasData = null;
    
    this.updateModel(pathModel);
  }

  Box.prototype.button = function (pm) {
    this.hasData = true;
    this.isButton = true;
    this.isCircle = false;
    this.pathModel = pm;
  }

  Box.prototype.hideIfEmpty = function () {
    if (!this.hasData) {
      this._guiRect.visible = false;
    }
  }

  Box.prototype.showIfEmpty = function () {
    if (!this.hasData) {
      this._guiRect.visible = true;
    }
  }

  Box.prototype.updateModel = function (pathModel) {
    if (pathModel === undefined || pathModel == null) return;

    this.pathModel = pathModel;
    this.wordModel = pathModel.getWordAt(this.index);
    this.hasData = this.wordModel != null;
    this.isCircle = pathModel.nWords == 0;

    this.show();
  }

  Box.prototype.show = function () {
    if (this.hasData) {
      this.active = false;     
      if (this._guiRect != null) { this._guiRect.remove(); this._guiRect = null; }
      if (this.isButton) {
        if (this._guiElem == null) this.createBtn(); else this.updateBtn();
      } else {
        this.prevAngle = 0;
        if (this._guiElem == null) this.createElem(); else this.updateElem();
      }
    } else {
      if (this._guiElem != null) { this._guiElem.remove(); this._guiElem = null; }
      if (this._guiRect == null) this.createRect(); else this.updateRect();
    }
    this.createText('');
  };

  Box.prototype.width = function () {
    if (this.hasData) {
      return this._guiElem.outerWidth();
    }
    if (this.isCircle) return Box.options.circle.radius;

    return Box.options.rect.size.x * 2;
  };

  Box.prototype.updateBtn = function () {    
    var values = {
      left: this.cPoint.x - Box.pathOptions.container.left - this._guiElem.outerWidth() / 2,
      top: this.cPoint.y - Box.pathOptions.container.top - this._guiElem.outerHeight() / 2
    };

    this.scale *= .6;

    var btn = this._guiElem.find('.button');
    if (Box.options.animate) {
      btn.stop(); this._guiElem.stop();
      this._guiElem.transition(values);
      btn.transition({scale: this.scale}, 500, 'ease');
    }
    else {
      this._guiElem.css(values);
      btn.transition({
        scale: this.scale,
        rotate: this.angle + 'deg'
      });
    }
  }

  Box.prototype.createBtn = function () {
    var div = $('<div/>', { 'class': 'confirm-box'}), base = this;
    var cw = this.pathModel.cw ? ' cw' : '';

    div.append(
      $('<div/>', { 'class': 'button', title: 'Done!' }).append(
        $('<div/>', { 'class': 'tooltip' + cw, text: 'Click me when you are done!' })));

    div.css({
      left: this.pathModel.canvas.cPoint.x - Box.pathOptions.container.left,
      top: this.pathModel.canvas.cPoint.y - Box.pathOptions.container.top,
      zIndex: 2
    });
    div.appendTo('#tiles');

    div.find('.button').one("click", this, function (e) {
      Box.options.animate = true;
      base.pathModel.phrase._complete(true);
      base.pathModel.phrase.words.valueHasMutated();
      Box.options.animate = false;
    }).transition({
      perspective: '80px',
      rotateY: '360deg'
    });

    this.width = function () { return div.outerWidth() / 2; }

    if (this._guiElem != null) this._guiElem.remove();
    this._guiElem = div;

    this.updateBtn();
  }

  Box.prototype.updateElem = function () {
    if (this.pathModel.phrase.complete()) {
      this._guiElem.addClass("placed");
      this._guiElem.off('click');
    }

    this._guiElem.text(this.wordModel.lemma);

    var values = {
      left: this.cPoint.x - Box.pathOptions.container.left - this._guiElem.outerWidth() / 2,
      top: this.cPoint.y - Box.pathOptions.container.top - this._guiElem.outerHeight() / 2,
      rotate: this.angle + 'deg'
    };

    if (Box.options.animate) {
      values.scale = this.scale;
      this._guiElem.stop();
      this._guiElem.transition(values, 500, 'ease');
    }
    else {
      this._guiElem.css(values);
      this._guiElem.transition({ scale: this.scale });
    }
  }

  Box.prototype.createElem = function () {
    var div = $('<div/>', { 'class': 'magnet', text: this.wordModel.lemma });

    if (this.wordModel.isRelated) div.addClass("related");
    div.css({
      left: this.pathModel.canvas.cPoint.x - Box.pathOptions.container.left,
      top: this.pathModel.canvas.cPoint.y - Box.pathOptions.container.top,
      zIndex: 2
    });
    div.appendTo('#tiles');

    div.one("click", this, function (e) {
      if (e.data.pathModel.phrase.complete()) return;
      e.data.pathModel.removeWordAt(e.data.index);
    });

    if (this._guiElem != null) this._guiElem.remove();
    this._guiElem = div;

    this.updateElem();
  };

  Box.prototype.updateRect = function () {
    var item = this._guiRect

    item.rotate(this.angle - this.prevAngle);
    item.scale(this.scale - this.prevScale + 1);
    item.position = this.cPoint;
    
    this.prevAngle = this.angle;
    this.prevScale = this.scale;
  };

  Box.prototype.createRect = function () {
    var item;

    if (this.isCircle) {
      item = new scope.Path.Circle(this.cPoint, Box.options.circle.radius);
      item.style = Box.options.circle.style;      
    } else {
      item = new scope.Path.Rectangle(
        this.cPoint.subtract(Box.options.rect.size),
        this.cPoint.add(Box.options.rect.size));
      item.style = Box.options.rect.style;
    }
    item.data = this;

    if (this._guiRect != null) this._guiRect.remove();
    this._guiRect = item;

    this.updateRect();
  };

  Box.prototype.enter = function (word) {
    if (!this.hasData && word != null) {
      this.active = true;
      if (this.isCircle) {
        this._guiRect.style = Box.options.circle.activeStyle;
      } else {
        this.wordModel = word;
        clearInterval(this._hoverHandler);
        this._hoverHandler = setTimeout(function (base) {
          base._guiRect.style = Box.options.rect.activeStyle;
          base._guiText.content = word.lemma;
          base._guiText.visible = true;
        }, 1, this);
      }
      return this;
    }
    return null;
  };

  Box.prototype.leave = function () {
    if (!this.hasData && this.active) {
      this.active = false;
      if (this.isCircle) {
        this._guiRect.style = Box.options.circle.style;
      } else {
        clearInterval(this._hoverHandler);
        this._hoverHandler = setTimeout(function (base) {
          base._guiRect.style = Box.options.rect.style;
          base._guiText.visible = false;
        }, 1, this);
      }
    }
  };

  Box.prototype.drop = function () {
    if (this.active && !this.hasData && this.wordModel != null) {
      if (!this.pathModel.addWord(this.wordModel, this.index)) {
        app.woz.dialog.show('alert', "It's not your turn!");
      }
    }
  };

  Box.prototype.put = function (data) {
    /// <param name='data' value='{obsWords: ko.observableArray(), obsWord: ko.observable()}'/>
    if (!this.hasData && data.obsWords() != null) {
      var nWord = this.pathModel.nWords;
      var activeWords = data.obsWords();
      if (activeWords.length == nWord) {
        for (var i = 0; i < activeWords.length; i++) {
          this.pathModel.addWord(activeWords[i], i + 1);
        }
      }
    }
  };

  Box.prototype.createText = function (content) {
    var text = new scope.PointText({
      point: this.cPoint,
      content: '-',
      style: Box.options.textStyle,
      visible: false
    });
    text.position.y += 5;
    text.rotate(this.angle, this.cPoint);
    text.characterStyle.fontStyle = 'bold';

    text.sendToBack();

    if (this._guiText) this._guiText.remove();

    return this._guiText = text;    
  };

  Box.prototype._clear = function () {
    if (this._guiRect) this._guiRect.remove();
    if (this._guiElem) this._guiElem.remove();
    if (this._guiText) this._guiText.remove();

    this._guiElem = null;
    this._guiRect = null;
    this._guiText = null;
  };

  Box.prototype.remove = function () {
    this._clear();
  };

  Box.options = {
    animate: false,   //should be off for resizing and placing words
    rect: {
      style: {
        strokeColor: '#CBB28F',
        strokeWidth: 1,
        fillColor: transparent,
        shadowColor: transparent
      },
      activeStyle: {
        strokeWidth: 2,
        shadowColor: '#CBB28F',
        shadowBlur: 5,
        shadowOffset: new scope.Point(0, 0)
      },
      size: new scope.Point(30, 15)
    },
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
    textStyle: {
      fillColor: 'grey',
      justification: 'center',
      fontSize: 14,
      font: 'CopseRegular'
    }
  };

  return Box;

});