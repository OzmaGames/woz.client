define(['api/datacontext', 'api/draggable'], function (ctx, draggable) {

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
         return { cacheViews: false };
      },
      
      detached: function (view) {
         $( '.magnet', view ).each( function ( i, el ) {
            var draggable = $( el ).data( 'draggable' );
            if ( draggable && draggable.dispose ) {
               draggable.dispose();
            }            
         } );
      },

      afterRender: function (el, word) {        
         var $el = $(el);

         if (word.originalX === undefined) word.originalX = word.x;
         if (word.originalY === undefined) word.originalY = word.y;

         word.x = word.originalX;
         word.y = word.originalY;

         $el.css({
            left: (100 * word.x).toFixed(2) + '%',
            top: (100 * word.y).toFixed(2) + '%'            
         });
         
         $el.data("immovable", ctx.words.immovable);

         
         $el.draggable({

            withinEl: $el.parent(),

            parent: $('#app'),

            dragStart: function () {

               if (ctx.mode() == 'swapWords') {
                  app.Sound.play( app.Sound.sounds.word.select );
                  word.isSelected( word.isSelected() ^ 1 );
               } else {
                  app.Sound.play( app.Sound.sounds.word.lift );
                  ctx.activeWord( word );
                  $el.css({ rotate: 0 });
               }
               word.originalX = word.x;
               word.originalY = word.y;

               if ( $el.hasClass( 'new' ) ) {
                  $el.removeClass( 'new' );
                  word.css = word.css.replace( "new", "" );                  
               }
            },

            dropped: function (e, data) {
               ctx.activeWord(null);

               word.x = (data.hasMoved ? data.left / 100 : word.x).toFixed(4) * 1;
               word.y = (data.hasMoved ? data.top / 100 : word.y).toFixed(4) * 1;

               if ( !word.isPlayed && data.hasMoved ) {
                  word.originalX = word.x;
                  word.originalY = word.y;

                  if ( !ctx.tutorialMode() ) {
                     app.trigger( "server:game:move-word", {
                        username: ctx.username,
                        gameID: ctx.gameID,
                        word: {
                           id: word.id,
                           x: word.x,
                           y: word.y
                        }
                     } );
                  }
               } else if ( word.isPlayed ) {
                  $el.hide();
               }
            }
         });

         if (animationQueue.length == 0) setTimeout(showWords, 100);

         animationQueue.push( function ( cb ) {
            Task.run( function () {
               if ( !word.soundPlayed ) {
                  word.soundPlayed = true;
                  app.Sound.play( app.Sound.sounds.word.show );
               }
            }, 200 );

            $el.css({
               rotate: word.angle,
               scale: 1,
               opacity: 1
            }).delay(100).promise().then(cb);
         });

         word.$el = $el;
      }
   }
});