define( 'game/poem', ['api/datacontext', 'api/draggable'], function ( ctx, draggable ) {

   var phrases = ctx.paths().map( function ( p ) { return p.phrase.words.sort( function ( a, b ) { return a.index - b.index; } ); } );

   return {
      phrases: phrases,
      phraseRender: function ( elem ) {
         var $li = $( elem ).filter( 'li' );
         $ul = $li.parent();

         var $phrase = $( '.phrase', $li ).draggable( {
            withinEl: $ul,
            parent: $( document ),
            topLimit: true,
            usePercentage: false,

            dragStart: function ( e, within ) {
               //within.t = -( $li.offset().top - $( 'li:first', $ul ).offset().top ) - 20;
               //within.b = -( $li.offset().top - $( 'li:last', $ul ).offset().top - $li.height() ) + 20;

               $phrase.css( { width: $phrase.width() } );

               var h = $ul.height(), w = $ul.width();

               $ul.css( { height: h, width: w } );
               $( $( 'li', $ul ).get().reverse() ).each( function () {
                  var posY = $( this ).position().top;
                  $( this ).css( { y: posY } ).data( { y: posY } );
               } );
               $ul.addClass( 'drag' );

               $li.addClass( 'hole' );
            },

            dropped: function () {
               $li.removeClass( 'hole' );

               $phrase.css( { top: 0 } );               
            },

            move: function ( e, position ) {
               
               if ( position.top > 20 && !$li.is( ':last-child' ) ) {
                  var yThis = $li.data( "y" );
                  var yNext = $li.next().data( "y" );
                  
                  $li.css( { y: yNext } );
                  $li.next().css( { y: yThis } );
               } else if ( position.top < -20 && !$li.is( ':first-child' ) ) {

               }

               return true;
            }
         } );
      }
   };

} );