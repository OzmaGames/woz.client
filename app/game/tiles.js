define(['durandal/app', 'api/datacontext', 'api/draggable'], function (app, ctx) {

  var boundaries = { l: 0, r: window.innerWidth - 100, t: 100, b: window.innerHeight * (3 / 4) - 100 };

  var instructionDoms = [];

  function scroll(e) {
    var top = $(window).scrollTop(), topPadding = 15;

    for (var i = 0; i < instructionDoms.length; i++) {
      var $el = instructionDoms[i],
        elTop = $el.data('top') || $el.offset().top - parseInt($el.css('margin-top'));
      if (top > elTop && !$el.data('top')) {
        var margin = top - elTop + topPadding, angle;

        if (!$el.hasClass("fixed")) {
          $el
            .css({ position: "fixed", left: $el.offset().left, top: topPadding })
            .addClass("fixed")
            .data({
              parent: $el.parent(),
              top: elTop
            })
            .appendTo('body');
        }
      } else if (top <= elTop) {
        if ($el.hasClass("fixed")) {
          $el
            .css({ position: '', left: '', top: '' })
            .appendTo($el.data('parent')).removeClass("fixed")
            .data('top', 0);
        }
      }
    }
  }

  var animationQueue = [];
  var RADIUS = 75;

  function showTiles() {
    for (var i = 0; i < animationQueue.length; i++) {
      var $el = animationQueue[i].$el;
      var tile = animationQueue[i].tile;
      $el.css({
        left: tile.x * 100 + '%',
        top: tile.y * 100 + '%'
      });

      tile.ruleOffset = { x: 0, y: 0 };

      UpdateTileInstruction(tile, true);
    }
    animationQueue = [];

    $(window).scroll(scroll);
  }

  function UpdateTileInstruction(tile, animate) {
    var angle = tile.angle;

    tile.ruleOffset.x = Math.sin(angle * (Math.PI / 180)) * RADIUS;
    tile.ruleOffset.y = Math.cos(angle * (Math.PI / 180)) * RADIUS;

    var diff = {
      rotate: (angle > 90 || angle < -90) ? angle + 180 : angle,
      marginLeft: tile.ruleOffset.x,
      marginTop: RADIUS - tile.ruleOffset.y
    };

    if (animate)
      tile.$inst.stop().transition(diff, 1000);
    else
      tile.$inst.stop().css(diff);

  }

  return {
    tiles: ctx.tiles,
    gameOver: ctx.gameOver,
    collection: ctx.collection,
    carryingWords: ko.computed(function () {
      words = ctx.activeWords();
      word = ctx.activeWord();
      return words || word;
    }),

    disabled: ko.computed(function () {
      var mode = ctx.mode();
      return mode == 'swapWords' || mode == 'circleWords';
    }),

    activate: function () { },

    binding: function () {
      return { cacheViews: false };
    },

    compositionComplete: function (view, parent) {

    },

    toggleTile: function (tile) {
      var active = this.active();
      if (!active) {
        var h = $('#tiles').height();
        tile.$el.css({ 'font-size': h });
      } else {
        tile.$el.css({ 'font-size': '' });
      }
      tile.active(active ^ 1);
    },

    help: function (tile, e) {
      var offset = tile.$inst.offset(),
        left = offset.left,
        top = offset.top + 200 - $(window).scrollTop();

      if (tile.$inst.hasClass("fixed")) {
        top -= 120;
      }
      top = 150;

      app.dialog.show("window", {
        heading: tile.instruction,
        content: tile.description,
        left: left, top: top
      });
    },

    afterRender: function (el, tile) {
      var $el = $(el).filter('.tile:first');

      tile.$el = $el;
      tile.$inst = $el.find('.instruction');

      if (animationQueue.length == 0) setTimeout(showTiles, 100);
      animationQueue.push({ $el: $el, tile: tile });
    },

    detached: function () {

    }
  };
});