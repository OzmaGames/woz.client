define(['durandal/app', 'api/datacontext', 'api/draggable'], function (app, ctx) {

  var animationQueue = [];

  function showTiles() {
    for (var i = 0; i < animationQueue.length; i++) {
      var $el = animationQueue[i].$el;
      var tile = animationQueue[i].tile;
      $el.css({
        left: tile.x * 100 + '%',
        top: tile.y * 100 + '%'
      });
      var inst = $('.instruction', $el);
      inst.transition({
        rotate: ((tile.x - 0.1) - 0.5) * 30,
        marginLeft: (tile.x - 0.5) * 60
      });

    }
    animationQueue = [];

    $(window).scroll(scroll);
  }

  return {
    tiles: ctx.tiles,

    afterRender: function (el, tile) {
      var $el = $(el).filter('.tile:first');

      tile.$el = $el;
      tile.$inst = $el.find('.instruction');
      
      $el.draggable({
        withinEl: $el.parent(),
        centerBased: true,
        topLimit: true,        
        dragStart: function (e) { },
        move: function (e, data) {
          tile.x = data.left / $el.parent().innerWidth();
          tile.y = data.top / $el.parent().innerHeight();

          //$(window).resize();
          
          tile.$inst.stop().css({
            rotate: ((tile.x - 0.1) - 0.5) * 30,
            marginLeft: (tile.x - 0.5) * 60
          });          
        },
        dropped: function (e) {
          var paths = ctx.paths();
          for (var i = 0; i < paths.length; i++) {
            var p = paths[i];
            if (p.startTile.x > p.endTile.x) {
              var tmp = p.startTile;
              p.startTile = p.endTile;
              p.endTile = tmp;
              p.cw ^= 1;
            }
            p.phrase.words.valueHasMutated();
          }
        }
      });

      if (animationQueue.length == 0) setTimeout(showTiles, 100);
      animationQueue.push({ $el: $el, tile: tile });
    }
  };
});