define(['api/datacontext', 'jquery', 'knockout', 'api/draggable'], function (ctx, $, ko) {

  var boundaries = { l: 0, r: window.innerWidth - 100, t: 100, b: window.innerHeight * (3 / 4) - 100 };

  var instructionDoms = [];

  function scroll(e) {
    var top = $(window).scrollTop(), topPadding = 15;

    for (var i = 0; i < instructionDoms.length; i++) {
      var $el = instructionDoms[i],
        elTop = $el.data('top') || $el.offset().top - parseInt($el.css('margin-top'));
      if (top > elTop && !$el.data('top')) {
        var margin = top - elTop + topPadding, angle;

        //angle = (margin <= 80) ? -(Math.asin(margin / 80) * (180 / Math.PI)) : -(Math.asin((160 - margin) / 80) * (180 / Math.PI));
        //if (margin > 200) margin = 200;
        if ($el.css("position") != "fixed") {
          $el.css({ position: "fixed", left: $el.offset().left, top: topPadding });
          $el.data('parent', $el.parent());
          $el.data('top', elTop);
          $el.appendTo('body');
        }
        //$el.css({ marginTop: margin });
        //$el.stop().animate({
        //  marginTop: margin,
        //  //marginLeft: (margin <= 80 + topPadding) ? -margin * 1.2 : 1.2 * (margin - (160 + 2 * topPadding)),
        //}, 50);
      } else if (top <= elTop) {
        if ($el.css("position") == "fixed") {
          $el.css({ position: '', left: '', top: '' });
          $el.appendTo($el.data('parent'));
          $el.data('top', 0);
        }
        //$el.css({ marginTop: 0 });
        //$el.stop().animate({
        //  marginTop: 0,
        //  marginLeft: 0
        //}, 50);
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

    disabled: ko.computed(function () {
      return ctx.mode() == 'swap';
    }),

    activate: function () { },

    binding: function () {
      return { cacheViews: false };
    },

    compositionComplete: function (view, parent) {

    },

    toggleTile: function () {
      this.active(this.active() ^ 1);
      if (this.active()) {
        var h = $('#tiles').height(),
          w = $('#tiles').width();
        this.$el.css({ width: h, left: w - h });
      } else {
        this.$el.css({ width: '', left: this.x * 100 + '%' });
      }
    },

    help: function (tile, e) {
      e.preventDefault();
      e.stopPropagation();

      return false;
    },

    afterRender: function (el, tile) {
      var $el = $(el).filter('.tile:first');

      //$el.draggable({
      //  withinEl: $el.parent(),
      //  dragStart: function (e) { },
      //  move: function (e) {
      //    tile.x = $el.position().left / $el.parent().innerWidth();
      //    tile.y = $el.position().top / $el.parent().innerHeight();

      //    $(window).resize();
      //  }
      //});
      tile.$el = $el;

      if (animationQueue.length == 0) setTimeout(showTiles, 100);
      animationQueue.push({ $el: $el, tile: tile });
    },

    detached: function () {

    }
  };
});