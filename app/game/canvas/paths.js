define(['api/datacontext', 'game/canvas/viewModel/Path', 'game/canvas/viewModel/DynamicPath', 'paper'], function (ctx, Path, DynamicPath) {

  var scope = paper;
  var activeWord = ctx.activeWord;
  var activeWords = ctx.activeWords;
  var transparent = new scope.Color(0, 0);

  var resizeHelperID = null;
  var resizeDelay = 100;
  var pathViewModels = [];

  /*
  $('<button/>', { text: 'debug', style: "padding:10px;position:absolute;z-index:10,top:0,right:0" }).click(function () {
      Path.options.debug = 1;
      var btn = $(this).hide();

      redraw();

      var paths = ctx.paths();

      var div = $('<div/>', { id: 'tileDebugWin', class: '', style: "position:absolute;margin:10px;width: 200px;height: 300px;z-index:10;background-color:white" });
      div.append($('<input/>', { type: "number", value: paths[0].nWords }).change(function () { paths[0].nWords = $(this).val(); update() }));
      div.append($('<input/>', { type: "number", value: paths[1].nWords }).change(function () { paths[1].nWords = $(this).val(); update() }));
      div.append($('<input/>', { type: "number", value: paths[2].nWords }).change(function () { paths[2].nWords = $(this).val(); update() }));
      div.append($('<hr/>'));
      div.append($('<div/>', { text: 'min arc:' }));
      div.append($('<input/>', { type: "number", value: Path.options.minArc }).change(function () { Path.options.minArc = $(this).val(); update() }));
      div.append($('<div/>', { text: 'box size:' }));
      div.append($('<input/>', { type: "blah", value: Path.Box.options.rect.size.x + ',' + Path.Box.options.rect.size.y }).change(function () { Box.options.rect.size = new paper.Point($(this).val().split(',')[0] * 1, $(this).val().split(',')[1] * 1); update() }));
      div.append($('<div/>', { text: 'tile margin:' }));
      div.append($('<input/>', { type: "number", value: Path.options.tileMargin }).change(function () { Path.options.tileMargin = $(this).val() * 1; update() }));
      div.append($('<div/>', { text: 'box margin:' }));
      div.append($('<input/>', { type: "number", value: Path.options.rectMargin }).change(function () { Path.options.rectMargin = $(this).val() * 1; update() }));
      div.append($('<div/>', { text: 'drop area:' }));
      div.append($('<input/>', { type: "number", value: Path.options.hoverMargin }).change(function () { Path.options.hoverMargin = $(this).val() * 1; update() }));
      div.append($('<hr/>'));
      div.append($('<input/>', { type: "checkbox", checked: Path.options.debug }).change(function () { Path.options.debug = $(this).is('checked'); update(); }));
      div.append($('<span/>', { text: 'debug:' }));

      div.append($('<button/>', { text: 'close', style: 'padding:10px' }).click(function () {
        btn.show(); $(this).closest('div').hide(); Path.options.debug = 0;
        $(window).trigger('resize');
      }));

      function update() {
        $(window).trigger('resize');
      }
      div.appendTo('body');
  }).appendTo('body');
  */

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

  function resize(canvas){
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
        if (pathModel.canvasSub === undefined) {
          pathModel.canvas = createPath(pathModel);
          pathModel.canvasSub = pathModel.phrase.words.subscribe(function (wordEntities) {
            updateModel();
            this.canvas.setup();
            this.canvas.show();
          }, pathModel);
          pathModel.phrase.words.valueHasMutated();

          pathViewModels.push(pathModel.canvas);
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

    for (var i = 0; i < pathViewModels.length; i++) {
      var pathModel = pathViewModels[i];
      pathModel.show();
    }

    paper.view.draw();
  }


  return { setup: setup, redraw: redraw };

});