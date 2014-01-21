define(['durandal/app', 'api/datacontext', 'game/canvas/vm/Path', 'game/canvas/vm/DynamicPath', 'paper'],
  function (app, ctx, Path, DynamicPath) {
     var canvasDOM;

     app.on("app:resized").then(resize);
     
     ctx.tiles.subscribe(function (tiles) {
        updateModel(tiles);
     });

     ctx.paths.subscribe(function (paths) {
        for (var i = 0; i < paths.length; i++) {
           createPath(paths[i]);
        }
     });

     paper.dfd = $.Deferred();

     if (ctx.tiles().length) {
        ctx.tiles.notifySubscribers(ctx.tiles());
     }
     if (ctx.paths().length) {
        ctx.paths.notifySubscribers(ctx.paths());
     }
     
     function updateModel(tiles) {
        paper.dfd.promise().then(function () {
           console.log("UpdateModel")
           var tilesDOM = $('#tiles'), container = tilesDOM.parent();

           Path.options.container = {
              width: tilesDOM.width(),
              height: tilesDOM.height(),
              left: container.position().left,
              top: container.position().top
           };

           updateTiles(tiles);
        })
     }

     app.on("game:tiles:update").then(updateTiles);

     function updateTiles(tiles) {
        tiles = tiles || ctx.tiles();

        for (var i = 0; i < tiles.length; i++) {
           var tile = tiles[i];
           tile.center = getTileCenterPoint(tile.x, tile.y);
        }

        function getTileCenterPoint(x, y) {
           var point = new paper.Point();
           point.x = Path.options.container.width * x + Path.options.container.left;
           point.y = Path.options.container.height * y + Path.options.container.top;

           return point;
        }
     }

     function createPath(pathModel) {
        paper.dfd.promise().then(function () {
           if (!pathModel.hasOwnProperty('canvas')) {
              pathModel.canvas =
                pathModel.nWords === 0 ?
                  new DynamicPath(pathModel) :
                  new Path(pathModel);

              redrawThisPath.call(pathModel);
              pathModel.canvasSub = pathModel.phrase.words.subscribe(redrawThisPath, pathModel);

              pathModel.dispose = function () {
                 console.log('%cPath Disposed', 'background: orange; color: white', pathModel.id);
                 if (pathModel.canvasSub) {
                    pathModel.canvasSub.dispose();
                    delete pathModel.canvasSub;
                 }
                 if (pathModel.canvas) {
                    pathModel.canvas.dispose();
                    delete pathModel.canvas;
                 }
              }
           }
        });
     }

     function redrawThisPath() {
        updateModel();
        this.canvas.setup();
        this.canvas.show();
     }

     function setup(canvas) {
        console.log("paths setup")

        paper.setup(canvas);

        paper.pathsCSize = { w: $(canvas).width(), h: $(canvas).height() };

        canvasDOM = canvas;

        paper.dfd.resolve();
     }

     function redraw() {
        
        var context = canvasDOM.getContext("2d");
        context.canvas.width = $(canvasDOM).width();
        context.canvas.height = $(canvasDOM).height();

        updateModel();

        var paths = ctx.paths();
        for (var i = 0; i < paths.length; i++) {
           paths[i].canvas.show();
        }

        paper.view.draw();
     }

     app.on("app:force-resize").then(redraw);

     function resize() {
        var cSize = { w: $(canvasDOM).width(), h: $(canvasDOM).height() };
        
        if (paper.pathsCSize.w != cSize.w || paper.pathsCSize.h != cSize.h) {
           paper.pathsCSize = cSize;
           paper.setup(canvasDOM);
           redraw();
           console.log('resized occurred');
        }
        else {
           console.log('resized ignored');
        }
     }

     function dispose() {
        console.log("paths disposed")
        paper.dfd = $.Deferred();
     }

     return { setup: setup, redraw: redraw, dispose: dispose };

  });