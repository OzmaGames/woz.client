define( ['api/datacontext', 'api/helper/draggable'], function ( ctx, draggable ) {

   var unplayedWords = ctx.unplayedWords;
   var qSet = [];

   for ( var i = 0; i < 4; i++ ) {
      qSet[i] = new Task.Queue( i );
   }

   function queueWord( word ) {
      var Q = qSet[Math.floor( Math.random() * qSet.length )];

      Q.runAfter( show.bind( this, word ), 50 + Math.random() * 250 );
   }


   return {
      words: unplayedWords,

      binding: function () {
         return { cacheViews: false };
      },

      detached: function ( view ) {
         $( '.magnet', view ).each( function ( i, el ) {
            var draggable = $( el ).data( 'draggable' );
            if ( draggable && draggable.dispose ) {
               draggable.dispose();
            }
         } );
      },

      afterRender: function ( el, word ) {
         var $el = $( el );

         if ( word.originalX === undefined ) word.originalX = word.x;
         if ( word.originalY === undefined ) word.originalY = word.y;

         word.x = word.originalX;
         word.y = word.originalY;

         word.$el = $el.css( {
            left: ( 100 * word.x ).toFixed( 2 ) + '%',
            top: ( 100 * word.y ).toFixed( 2 ) + '%'
         } )
            .data( "immovable", ctx.words.immovable )
            .draggable( {
               withinEl: $el.parent(),

               dragStart: function () {

                  if ( ctx.mode() == 'swapWords' ) {
                     app.Sound.play( app.Sound.sounds.word.select );
                     word.isSelected( word.isSelected() ^ 1 );
                  } else {
                     app.Sound.play( app.Sound.sounds.word.lift );
                     ctx.activeWord( word );
                     $el.css( { rotate: 0 } );
                  }
                  word.originalX = word.x;
                  word.originalY = word.y;

                  if ( $el.hasClass( 'new' ) ) {
                     $el.removeClass( 'new' );
                     word.css = word.css.replace( "new", "" );
                  }
               },

               dropped: function ( e, data ) {
                  ctx.activeWord( null );

                  word.x = ( data.hasMoved ? data.left / 100 : word.x ).toFixed( 4 ) * 1;
                  word.y = ( data.hasMoved ? data.top / 100 : word.y ).toFixed( 4 ) * 1;

                  if ( !word.isPlayed && data.hasMoved ) {
                     app.Sound.play( app.Sound.sounds.word.placeBack );

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
            } );

         queueWord( word );
      }
   }

   function show( word ) {
      word.$el.css( {
         rotate: word.angle,
         scale: 1,
         opacity: 1
      } );

      if ( !word.soundPlayed ) {
         word.soundPlayed = true;
         app.Sound.play( app.Sound.sounds.word.show );
      } else if ( word.soundPlaceBack ) {
         //delete word.soundPlaceBack;
         //app.Sound.play( app.Sound.sounds.word.placeBack );
      }
   }
} );