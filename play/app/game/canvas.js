define(['api/datacontext', 'paper', 'game/canvas/paths'], function (ctx, Paper, canvasPaths) {

  function setup(canvas) {
    var context = canvas.getContext("2d");
    context.canvas.width = $(canvas).width()
    context.canvas.height = $(canvas).height();
    
    if (canvasPaths.setup) canvasPaths.setup(canvas);    
  }

  return {
    compositionComplete: function (canvas) {
      setup(canvas);
    },

    binding: function () {
      return { cacheViews: false };
    },
    
    detached: function () {
      canvasPaths.dispose();
    }

  };
});