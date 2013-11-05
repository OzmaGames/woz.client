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

      tile.angle(Math.floor(((tile.x - 0.1) - 0.5) * 30));
      tile.instuctorMargin = Math.sin(tile.angle() * (Math.PI / 180)) * 150;

      var inst = $('.instruction', $el);
      inst.transition({
        rotate: tile.angle(),
        marginLeft: tile.instuctorMargin
      });

    }
    animationQueue = [];

    $(window).scroll(scroll);
  }

  function UpdateTileInstruction(tile) {
    tile.instuctorMargin = Math.sin(tile.angle() * (Math.PI / 180)) * 150;
    tile.$inst.stop().css({
      rotate: tile.angle(),
      marginLeft: tile.instuctorMargin
    });
  }

  return {
    tiles: ctx.tiles,

    tileAngleUp: function (tile, e) {
      tile.angle(tile.angle() + 1);
      UpdateTileInstruction(tile);
      e.stopPropagation();
      return false;
    },

    tileAngleDown: function (tile, e) {
      tile.angle(tile.angle() - 1);
      UpdateTileInstruction(tile);
      e.stopPropagation();
      return false;
    },

    del: function (tile, e) {
      var paths = ctx.paths();
      for (var i = 0; i < paths.length; i++) {
        var path = paths[i];
        if (path.startTile.id == tile.id || path.endTile.id == tile.id) {
          ctx.paths.splice(ctx.paths.indexOf(path), 1);
          path.dispose();
          i--;
        }
      }

      ctx.tiles.splice(ctx.tiles.indexOf(tile),1);
    },

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

          tile.angle(Math.floor(((tile.x - 0.1) - 0.5) * 30));
          UpdateTileInstruction(tile);
        },
        dropped: function (e, data) {
          if (!data.hasMoved) return;
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