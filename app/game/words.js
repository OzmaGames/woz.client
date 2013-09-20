define(['api/datacontext', 'jquery', 'api/draggable'], function (ctx, $, draggable) {

  var boundaries = { l: 0, r: window.innerWidth, t: 0, b: window.innerHeight / 2 };

  var unplayedWords = ctx.unplayedWords;

  var animationQueue = [];

  var showWords = function () {
    animationQueue = animationQueue.sort(function () { return 0.5 - Math.random(); });

    function next() {
      if (animationQueue.length) animationQueue.pop().call(this, next);
    }

    setTimeout(next, 75);
    setTimeout(next, 200);
    setTimeout(next, 280);
  }

  return {
    words: unplayedWords,

    binding: function () {
      //cancels view caching for this module, allowing the triggering of the detached callback
      return { cacheViews: false };
    },

    bindingComplete: function (view) {
      //showWords()
    },

    detached: function (view) {
      $('.magnet', view).each(function (i, el) { $(el).data('draggable').dispose() });
    },

    //reposition each word on the screen and add draggable feature to it
    afterRender: function (el, word) {
      var $el = $(el);

      $el.css({
        left: 100 * word.x + '%',
        top: 100 * word.y + '%',
        "-webkit-transform": "rotate(" + word.angle + "deg)",
        "-moz-transform": "rotate(" + word.angle + "deg)",
        "-ms-transform": "rotate(" + word.angle + "deg)",
        "-o-transform": "rotate(" + word.angle + "deg)",
        "transform": "rotateY(" + word.angle + "deg)"
      });

      $el.draggable({

        withinEl: $el.parent(),

        dragStart: function () {
          ctx.activeWord(word);

          $el.css({ "-webkit-transform": "", "-moz-transform": "", "-ms-transform": "", "-o-transform": "", "transform": "" });
        },

        dropped: function (e, data) {
          ctx.activeWord(null);

          
          word.x = data.hasMoved ? data.left / 100 : word.x;
          word.y = data.hasMoved ? data.top / 100 : word.y;


        }
      }).hide();

      if (animationQueue.length == 0) setTimeout(showWords, 100);

      animationQueue.push(function (cb) { return $el.show(200, cb); });

      word.$el = $el;
    }
  }
});