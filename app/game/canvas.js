define(['api/datacontext', 'paper', 'game/canvas/paths', 'game/canvas/selection'], function (ctx, Paper, canvasPaths, canvasSelection) {

    function setup(canvas) {
        var context = canvas.getContext("2d");
        context.canvas.width = $(canvas).width()
        context.canvas.height = $(canvas).height();

        if (canvasSelection.setup) canvasSelection.setup(canvas);
        if (canvasPaths.setup) canvasPaths.setup(canvas);
    }

    function redraw(canvas) {
        var context = canvas.getContext("2d");
        context.canvas.width = $(canvas).width()
        context.canvas.height = $(canvas).height();

        if (canvasSelection.redraw) canvasSelection.redraw(canvas);
        if (canvasPaths.redraw) canvasPaths.redraw(canvas);
    }

    return {
        attached: function (canvas) {
            $(window).resize(canvas, function (e) {
                redraw(e.data);
            });
        },

        compositionComplete: function (canvas) {
            setup(canvas);
        }
    };
});