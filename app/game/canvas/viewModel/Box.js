define(['api/datacontext', 'paper'], function (ctx) {

  var scope = paper;
  var transparent = new scope.Color(0, 0);

  function Box(index, pathModel, cPoint, angle) {
    var base = this;

    base.index = index;
    base.active = false;
    base.cPoint = cPoint;
    base.angle = angle;

    base._guiRect = null;
    base._guiText = null;
    base._guiElem = null;

    base.prevAngle = 0;

    this.setPath(pathModel);
  }

  Box.prototype.setPath = function (pathModel) {
    if (pathModel === undefined || pathModel == null) return;
    this.pathModel = pathModel;
    this.wordModel = pathModel.getWordAt(this.index);
    this.hasData = this.wordModel != null;
    this.show();
  }

  Box.prototype.setWord = function (word) {
    this.hasData = true;
    this.wordModel = word;
    this.show();
  };

  Box.prototype.removeWord = function () {
    this.hasData = false;
    this.wordModel = null;
    this.show();
  }

  Box.prototype.show = function () {
    if (this.hasData) {
      this.active = false;
      this.prevAngle = 0;
      if (this._guiRect != null){
        //animation
        this._guiRect.remove();
        this._guiRect = null;
      }
      if (this._guiText != null) { this._guiText.remove(); this._guiText = null;}
      if (this._guiElem == null) this.createElem(); else this.updateElem();
    } else {
      if (this._guiElem != null) {
        //animation
        this._guiElem.remove();
        this._guiElem = null;
      }
      if (this._guiRect == null) this.createRect(); else this.updateRect();
    }
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
      top: this.cPoint.y - Box.pathOptions.container.top - 18,
      "-webkit-transform": "rotate(" + this.angle + "deg)",
      "-moz-transform": "rotate(" + this.angle + "deg)",
      "-ms-transform": "rotate(" + this.angle + "deg)",
      "-o-transform": "rotate(" + this.angle + "deg)",
      "transform": "rotate(" + this.angle + "deg)"
    });
  }

  Box.prototype.createElem = function () {
    var div = $('<div/>', { 'class': 'magnet', text: this.wordModel.lemma });

    div.css({
      left: Box.pathOptions.container.width / 2,
      top: Box.pathOptions.container.top + Box.pathOptions.container.height / 2
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
    this._guiRect.position = this.cPoint;
    this._guiRect.style = Box.options.rect.style;

    this.prevAngle = this.angle;
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

      this._guiRect.style = Box.options.rect.activeStyle;

      if (this._guiText) this._guiText.remove();
      this._guiText = this.createText(this.wordModel.lemma);

      return this;
    }
    return null;
  };

  Box.prototype.leave = function () {
    if (!this.hasData && this.active) {
      this.active = false;

      this._guiRect.style = Box.options.rect.style;

      if (this._guiText) this._guiText.remove();
      this._guiText = null;
    }
  };

  Box.prototype.drop = function () {
    if (this.active && !this.hasData && this.wordModel != null) {
      this.pathModel.addWord(this.wordModel, this.index);
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
    if (this._guiText) this._guiText.remove();

    var text = new scope.PointText({
      point: this.cPoint,
      content: content
    });
    text.style = Box.options.textStyle;
    text.position.y += 5;
    text.rotate(this.angle, this.cPoint);
    text.characterStyle.fontStyle = 'bold';

    this._guiText = text;

    return text;
  };

  Box.prototype.clear = function () {
    if (this._guiRect) this._guiRect.remove();
    if (this._guiElem) this._guiElem.remove();
    if (this._guiText) this._guiText.remove();

    this._guiElem = null;
    this._guiRect = null;
    this._guiText = null;
  };

  Box.prototype.remove = function () {
    this.clear();
  };

  Box.options = {
    rect: {
      style: {
        strokeColor: '#CBB28F',
        strokeWidth: 1,
        shadowColor: transparent
      },
      activeStyle: {
        strokeWidth: 2,
        shadowColor: '#CBB28F',
        shadowBlur: 5,
        shadowOffset: new paper.Point(0, 0)
      },
      size: new paper.Point(30, 15)
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