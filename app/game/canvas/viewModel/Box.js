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

    base._guiRect = null;
    base._guiText = null;
    base._guiElem = null;

    base.pathModel = base.wordModel = base.hasData = null;
    
    this.updateModel(pathModel);
  }

  Box.prototype.updateModel = function (pathModel) {
    if (pathModel === undefined || pathModel == null) return;

    this.pathModel = pathModel;
    this.wordModel = pathModel.getWordAt(this.index);
    this.hasData = this.wordModel != null;

    this.show();
  }

  Box.prototype.show = function () {
    if (this.hasData) {
      this.active = false;
      this.prevAngle = 0;
      if (this._guiRect != null) { this._guiRect.remove(); this._guiRect = null; }
      if (this._guiElem == null) this.createElem(); else this.updateElem();
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
    return Box.options.rect.size.x * 2;
  };

  Box.prototype.updateElem = function () {
    if (this.pathModel.phrase.complete()) {
      this._guiElem.addClass("placed");
      this._guiElem.off('click');
    }

    this._guiElem.css({
      left: this.cPoint.x - Box.pathOptions.container.left - this._guiElem.outerWidth() / 2,
      top: this.cPoint.y - Box.pathOptions.container.top - this._guiElem.outerHeight() / 2
    }).transition({ rotate: this.angle + 'deg', scale: this.scale });
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
    this._guiRect.rotate(this.angle - this.prevAngle);
    this._guiRect.scale(this.scale - this.prevScale + 1);
    this._guiRect.position = this.cPoint;
    this._guiRect.style = Box.options.rect.style;

    this.prevAngle = this.angle;
    this.prevScale = this.scale;
  };

  Box.prototype.createRect = function () {
    var rect = new scope.Path.Rectangle(
      this.cPoint.subtract(Box.options.rect.size),
      this.cPoint.add(Box.options.rect.size));
    rect.data = this;

    if (this._guiRect != null) this._guiRect.remove();
    this._guiRect = rect;

    this.updateRect();
  };

  Box.prototype.enter = function (word) {
    if (!this.hasData && word != null) {
      this.active = true;

      this.wordModel = word;
      
      clearInterval(this._hoverHandler);
      this._hoverHandler = setTimeout(function (base) {
        base._guiRect.style = Box.options.rect.activeStyle;
        base._guiText.content = word.lemma;
        base._guiText.visible = true;
      }, 1, this);
      
      return this;
    }
    return null;
  };

  Box.prototype.leave = function () {
    if (!this.hasData && this.active) {
      this.active = false;

      clearInterval(this._hoverHandler);
      this._hoverHandler = setTimeout(function (base) {
        base._guiRect.style = Box.options.rect.style;
        base._guiText.visible = false;
      }, 1, this);
    }
  };

  Box.prototype.drop = function () {
    if (this.active && !this.hasData && this.wordModel != null) {
      if (!this.pathModel.addWord(this.wordModel, this.index)) {
        app.trigger('alert:show', "It's not your turn!");
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
    textStyle: {
      fillColor: 'grey',
      justification: 'center',
      fontSize: 14,
      font: 'CopseRegular'
    }
  };

  return Box;

});