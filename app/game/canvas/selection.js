define(['durandal/app', 'api/datacontext', 'paper', 'jquery'], function (app, ctx, Paper, $) {

  var scope = paper;
  var unplayedWords = ctx.unplayedWords;

  return {
    draw: draw, setup: setup, redraw: redraw,
    setScope: function (paperScope) { scope = paperScope; }
  };

  function setup(canvas) {
    //scope = new paper.PaperScope();
    //scope.setup(canvas);    

    draw();
  }

  function redraw() {

    draw();
  }

  function draw() {
    //return;
    var tool = new scope.Tool(), stars = [], path;

    //tool.minDistance = 32;
    tool.fixedDistance = 32;

    //var text = new paper.PointText({
    //  point: new paper.Point(100, 300),
    //  content: ''
    //});
    //text.fillColor = 'black';

    tool.onMouseDown = function (event) {
      //text.content = "mouseDown";
      path = new scope.Path();
      path.add(event.point);
      path.strokeColor = 'red';
      stars = [];
      //addStarAt(event.point);
    };

    tool.onMouseDrag = function (event) {
      //text.content = "drag " + path.length;
      path.add(event.point);
      //addStarAt(event.point);
    };

    tool.onMouseUp = function (event) {
      //text.content = "mouseup " + path.length;
      if (path.length == 0) return;
      path.closePath();

      var selection = Selection(path, unplayedWords());

      if (selection.length < 3) {
        console.log("Too few words!");
      } else if (selection.length > 9) {
        console.log("Too many words!");
        app.woz.dialog.show("alert", "Too many words!");
      } else {
        selection = Sort(selection);
        ctx.activeWords(selection);
        $("body").animate({ scrollTop: 0 }, "slow");

        for (var i = 0; i < selection.length; i++) console.log(selection[i].lemma);
      }
      path.remove();
    };

    addStarAt = function (point) {
      star = new scope.Raster("star");

      star.position = point;
      star.rotate(Math.floor(Math.random() * 360));
      star.scale(.4 + Math.random() * .6);
      star.removeOnUp();
    };
  }

  function Sort(words) {
    var result = [];

    words.sort(sortX);

    while (words.length) {
      result.push(topLeft(words));
    }
    return result;

    function topLeft(words) {
      upper = words[0], slightY = 0;
      for (var i = 1; i < words.length; i++) {
        var word = words[i],
            diffY = upper.y - word.y;
        if (diffY - slightY > 0.06) {
          if (upper.x - word.x > 0.06) {

          }
          upper = word;
          slightY = 0;
        } else if (diffY > 0) {
          slightY += diffY;
        }
      }
      words.splice(words.indexOf(upper), 1);
      //console.log(upper);
      return upper;
    }

    function sortX(a, b) { return a.x - b.x; };
    function sortY(a, b) { return a.y - b.y; };

    var rows = [[]];
    var count = 1;
    var total = words[0].y;
    var average = words[0].y;
    var iterator = 0;

    rows[0].push(words[0]);

    for (var i = 0; i < words.length; i++) {
      if (Math.abs(words[i].y - average) > 0.06) {
        var row = [];
        rows.push(row);

        iterator++;
        rows[iterator].push(words[i]);

        count = 1;
        total = words[i].y;
        average = words[i].y;
      } else {
        count++;
        total = total + words[i].y;
        average = total / count;

        rows[iterator].push(words[i]);
      }
    }

    words = [];

    for (var i = 0; i < rows.length; i++) {
      rows[i].sort(function (a, b) {
        return a.x - b.x;
      });

      for (var j = 0; j < rows[i].length; j++) {
        words.push(rows[i][j]);
      }
    }

    return words;
  }

  function BasicSort(words) {
    return words.sort(function (a, b) {
      return a.x - b.x;
    });
  }

  function Selection(path, words) {
    return ko.utils.arrayFilter(words, function (word) {
      var cx = word.$el.offset().left + word.$el.innerWidth() / 2;
      var cy = word.$el.offset().top + word.$el.innerHeight() / 2;

      return path.contains(cx, cy);
    });
  }
});