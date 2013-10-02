define(['./Path', './Box'], function (Path, Box) {
  var scope = paper;

  var ctor = function (paperScope) {
    this._trash = [];

    this.hide = function () {
      for (var i = 0; i < this._trash.length; i++) {
        this._trash[i].remove();
      }
    }
    
    scope = paperScope;
  }

  ctor.prototype.events = {
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
    mousedown: function () { }
  };
  
  ctor.prototype.show = function (path, boxes) {
    this.hide();

    this.showDoneCenter(path);
    //this.showBox(path, boxes);
  }

  ctor.prototype.showBox = function (path, boxes) {
    var box;
    for (var i = 0; i < boxes.length; i++) {
      if (!boxes[i].hasData) break;
      box = boxes[i];
    }

    var cPoint = box.cPoint.add(path.getNormalAt(path.length / 2).normalize(-60)).add([50, 0]);
    var rect = this.createDoneContainer();
    var group = this.createDoneButton(new scope.Point(0, 0));
    rect.position = cPoint;
    group.position = cPoint.add([0, 15]);

    var text = new scope.PointText({
      point: cPoint.add([0, -15]),
      content: "Are you done?"
    });
    text.style = Path.Box.options.textStyle;
    text.fontSize = 12;
    text.fillColor = "black";

    this._trash.push(text);
  }

  ctor.prototype.createDoneContainer = function () {
    var size = new scope.Point(60, 40);
    var rect = new scope.Path.Rectangle(size.negate(), size);

    this._trash.push(rect);

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

  ctor.prototype.showDoneCenter = function (path) {
    var margin = 50;
    var offset = path.length / 2;
    var normal = path.getNormalAt(offset).normalize(margin);
    var cPoint = path.getPointAt(offset).add(normal);
    var group = this.createDoneButton(cPoint);
    group.rotate(path.getTangentAt(offset).angle, cPoint);
  }

  ctor.prototype.createDoneButton = function (cPoint) {
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
    button.on(this.events);

    this._trash.push(group);


    return group;
  }

  return ctor;
});