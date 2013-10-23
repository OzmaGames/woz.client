define(['api/datacontext', 'game/canvas/vm/Path', 'game/canvas/vm/DynamicPath', 'paper'],
  function (ctx, Path, DynamicPath) {

    var scope = paper;
    var activeWord = ctx.activeWord;
    var activeWords = ctx.activeWords;
    var transparent = new scope.Color(0, 0);

    //when the user resize the screen, wait for a couple of ms before rendering
    var resizeHelperID = null;
    var resizeDelay = 100;

    function updateModel() {
      paths = ctx.paths();

      Path.options.container = {
        width: $('#tiles').width(),
        height: $('#tiles').height(),
        left: $('#tiles').offset().left,
        top: $('#tiles').offset().top
      };

      for (var i = 0; i < paths.length; i++) {
        var pm = paths[i];

        pm.startTile.center = getTileCenterPoint(pm.startTile.x, pm.startTile.y);
        pm.endTile.center = getTileCenterPoint(pm.endTile.x, pm.endTile.y);
      }

      function getTileCenterPoint(x, y) {
        var point = new scope.Point();
        point.x = Path.options.container.width * x + Path.options.container.left;
        point.y = Path.options.container.height * y + Path.options.container.top;

        return point;
      }
    }

    function resize(canvas) {
      var cSize = { w: $(canvas).width(), h: $(canvas).height() };
      if (paper.pathsCSize.w != cSize.w || paper.pathsCSize.h != cSize.h) {
        paper.pathsCSize = cSize;
        console.log('resized occurred');
        redraw(canvas);
      }
      else {
        console.log('resized ignored');
      }
    }

    //run once
    function setup(canvas) {

      Path.scope = scope = paper;
      scope.setup(canvas);

      paper.pathsCSize = { w: $(canvas).width(), h: $(canvas).height() };
      $(window).resize(function () {
        clearTimeout(resizeHelperID);
        resizeHelperID = setTimeout(resize, resizeDelay, canvas);
      });

      updateModel();

      ctx.paths.subscribe(function (paths) {
        for (var i = 0; i < paths.length; i++) {
          var pathModel = paths[i];
          if (pathModel.canvas === undefined) {
            pathModel.canvas = createPath(pathModel);
            pathModel.canvasSub = pathModel.phrase.words.subscribe(function (wordEntities) {
              updateModel();
              this.canvas.setup();
              this.canvas.show();
            }, pathModel);
            pathModel.dispose = function () {
              pathModel.canvas.dispose();
              pathModel.canvasSub.dispose();
              pathModel.canvas = pathModel.canvasSub = null;
            }
            pathModel.phrase.words.valueHasMutated();
          }
        }
      });
      ctx.paths.valueHasMutated();

      return scope;
    }

    function createPath(pathModel) {
      if (pathModel.nWords === 0)
        return new DynamicPath(scope, pathModel)
      else
        return new Path(scope, pathModel);
    }

    function redraw(canvas) {
      var context = canvas.getContext("2d");
      context.canvas.width = $(canvas).width()
      context.canvas.height = $(canvas).height();

      updateModel();

      for (var i = 0; i < ctx.paths().length; i++) {
        var pathCanvas = ctx.paths()[i].canvas;
        pathCanvas.show();
      }

      paper.view.draw();
    }


    return { setup: setup, redraw: redraw };

  });