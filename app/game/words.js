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

      if (word.originalX === undefined) word.originalX = word.x;
      if (word.originalY === undefined) word.originalY = word.y;

      word.x = word.originalX;
      word.y = word.originalY;

      $el.css({
        left: 100 * word.x + '%',
        top: 100 * word.y + '%'
      }).transition({ rotate: word.angle + 'deg' });
      
      $el.data("immovable", ctx.words.immovable);

      $el.draggable({

        withinEl: $el.parent(),

        dragStart: function () {
          if (ctx.mode() == 'swap') {
            word.isSelected(word.isSelected() ^ 1);
          } else {
            ctx.activeWord(word);
            $el.css({ rotate: '0deg' });
          }
          word.originalX = word.x;
          word.originalY = word.y;
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