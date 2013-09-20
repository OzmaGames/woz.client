define(['api/datacontext', 'paper', 'game/canvas/paths', 'game/canvas/selection'], function (ctx, Paper, canvasPaths, canvasSelection) {

  function setup(canvas) {
    //var context = canvas.getContext("2d");
    //context.canvas.width = $(canvas).width()
    //context.canvas.height = $(canvas).height();
    
    var scope;
    if (canvasPaths.setup) scope = canvasPaths.setup(canvas);
    if (canvasSelection.setup) canvasSelection.setup(canvas);

    canvasSelection.setScope(scope);
    //canvas2 = $("<canvas/>", { style: "position:absolute;top:0,left:0;bottom:0;right:0" }).appendTo("#workspace")[0];
    //context = canvas.getContext("2d");
    //context.canvas.width = $(canvas).width()
    //context.canvas.height = $(canvas).height();
    
  }

  function redraw(canvas) {
    var context = canvas.getContext("2d");
    context.canvas.width = $(canvas).width()
    context.canvas.height = $(canvas).height();

    if (canvasPaths.redraw) canvasPaths.redraw(canvas);
    if (canvasSelection.redraw) canvasSelection.redraw();
  }

  return {
    attached: function (canvas) {
      $(window).resize(canvas, function (e) {
        console.log('resize');
        redraw(e.data);
      });
    },

    compositionComplete: function (canvas) {
      setup(canvas);
    }
  };
});