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
        rotate: ((tile.x-0.1) - 0.5) * 30,
        marginLeft: (tile.x - 0.5) * 60
      });

      instructionDoms.push(inst);
    }
    animationQueue = [];

    $(window).scroll(scroll);
  }

  return {
    tiles: ctx.tiles,

    collection: ctx.collection,

    disabled: ko.computed(function () {
      var mode = ctx.mode();
      return mode == 'swap' || mode == 'circle-words';
    }),

    activate: function () { },

    binding: function () {
      return { cacheViews: false };
    },

    compositionComplete: function (view, parent) {

    },

    toggleTile: function () {
      var active = this.active();
      if (!active) {
        var h = $('#tiles').height(),
            w = $('#tiles').width();
        this.$el.css({ width: h, left: w - h });
      } else {
        this.$el.css({ width: '', left: this.x * 100 + '%' });
      }
      this.active(active ^ 1);
    },

    help: function (tile, e) {
      var offset = tile.$inst.offset(),
        left = offset.left,
        top = offset.top + 200 - $(window).scrollTop();      

      if (tile.$inst.hasClass("fixed")) {
        top -= 120;
      }
      top= 150;
      
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