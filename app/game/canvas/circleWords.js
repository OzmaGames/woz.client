define(['durandal/system', 'durandal/app', 'api/datacontext', 'paper'], function (system, app, ctx, Paper) {

  var unplayedWords = ctx.unplayedWords, tool, dfd;

  circleWords = {
    load: function () {
      dfd = system.defer();
      draw();
      return dfd.promise();
    },
    reload: redraw,
    unload: unload
  };

  return circleWords;

  function unload() {
    //if (tool) {
    //  tool.detach('mousedown');
    //  tool.detach('mouseup');
    //  tool.detach('mousedrag');
    //  tool.remove();
    //  tool = null;
    //}
    paper.tool.remove();
  }

  function redraw() {
    draw();
  }

  function draw() {    
    tool = new paper.Tool(), stars = [], path;    

    tool.minDistance = 16;
    tool.maxDistance = 32;
   
    tool.onMouseDown = function (event) {
      path = new paper.Path();
      path.add(event.point);
      //path.strokeColor = 'red';
      stars = [];
      addStarAt(event.point);
    };

    tool.onMouseDrag = function (event) {
      path.add(event.point);
      addStarAt(event.point);
    };

    tool.onMouseUp = function (event) {
      if (path.length == 0) return;
      path.closePath();

      var selection = Selection(path, unplayedWords());

      if (selection.length < 3) {
        console.log("Too few words!");
        //dfd.reject(selection);
      } else if (selection.length > 9) {
        console.log("Too many words!");
        app.dialog.show("alert", { content: "Too many words!" });
        //dfd.reject(selection);
      } else {        
        selection = Sort(selection);        
        for (var i = 0; i < selection.length; i++) console.log(selection[i].lemma);
        dfd.resolve(selection);
      }
      path.remove();
    };

    addStarAt = function (point) {
      star = new paper.Raster("star");

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