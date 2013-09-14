define(['api/datacontext', 'jquery', 'knockout', 'api/draggable'], function (ctx, $, ko) {

    var boundaries = { l: 0, r: window.innerWidth - 100, t: 100, b: window.innerHeight * (3 / 4) - 100 };

    var instructionDoms = [];

    function scroll(e) {

        var top = $(window).scrollTop(), topPadding = 15;
        for (var i = 0; i < instructionDoms.length; i++) {

            var $el = instructionDoms[i], elTop = $el.offset().top - parseInt($el.css('margin-top'));

            console.log();

            if (top > elTop) {
                var margin = top - elTop + topPadding, angle;

                //angle = (margin <= 80) ? -(Math.asin(margin / 80) * (180 / Math.PI)) : -(Math.asin((160 - margin) / 80) * (180 / Math.PI));
                if (margin > 200) margin = 200;

                $el.stop().animate({
                    marginTop: margin,
                    marginLeft: (margin <= 80 + topPadding) ? -margin * 1.2 : 1.2 * (margin - (160 + 2 * topPadding)),
                });

                //console.log(margin);
            } else {
                $el.stop().animate({
                    marginTop: 0,
                    marginLeft: 0
                });
            }
        }
    }

    var animationQueue = [];

    function showTiles() {
        for (var i = 0; i < animationQueue.length; i++) {
            var $el = animationQueue[i].$el;
            var tile = animationQueue[i].tile;
            $el.css({
                left: tile.x * 100 + '%',
                top: tile.y * 100 + '%'
            })
            instructionDoms.push($('.instruction', $el));        
        }
        animationQueue = [];
        
        $(window).scroll(scroll);
    }

    return {
        tiles: ctx.tiles,

        activate: function () { },

        binding: function () {
            return { cacheViews: false };
        },

        compositionComplete: function (view, parent) {
            
        },

        afterRender: function (el, tile) {
            var $el = $(el).filter('.tile:first');

            $el.draggable({
                withinEl: $el.parent(),
                dragStart: function (e) { },
                move: function (e) {                    
                    tile.x = $el.position().left / $el.parent().innerWidth();
                    tile.y = $el.position().top / $el.parent().innerHeight();

                    $(window).resize();
                }
            });

            if (animationQueue.length == 0) setTimeout(showTiles, 100);
            animationQueue.push({$el: $el, tile: tile});
        },

        detached: function () {

        }
    };
});