define( 'game/poem/phrase', ['api/datacontext', 'api/draggable'], function ( ctx, draggable ) {
   
   var phrases = ctx.paths().map( function ( p, index ) {
      return {
         words: p.phrase.words.sort( function ( a, b ) { return a.index - b.index; } ),
         index: index,
         excluded: true
      }
   } );

   ctx.poem = {
      phrases: phrases
   };
   
   return {
      activate: function () {

      },
      phrases: phrases,
      phraseRender: function ( elem ) {
         var $li = $( elem ).filter( 'li' );
         $ul = $li.parent();

         var carrier = {};

         var $phrase = $( '.phrase', $li ).draggable( {
            withinEl: $ul,
            parent: $( document ),
            topLimit: true,
            usePercentage: false,

            dragStart: function ( e, within ) {
               within.t -= 20;
               within.b += 20;
               within.r -= 2;
               
               var h = $ul.height(), w = $ul.width();

               $ul.css( { height: h, width: w } );
               $( $( 'li', $ul ).get().reverse() ).each( function () {
                  var posY = $( this ).position().top;
                  var phrase = $( this ).css( { y: posY } ).data( { y: posY } ).children( '.phrase' );
                  phrase.css( { width: phrase.outerWidth() } );
               } );
               $ul.addClass( 'drag' );

               $li.addClass( 'hole' );

               carrier = {
                  offsetY: $phrase.offset().top,
                  height: $phrase.height()
               };
            },

            dropped: function () {
               $li.removeClass( 'hole' );

               $phrase.css( { top: 0 } );
            },

            move: function ( e, position ) {

               if ( position.top > carrier.offsetY + carrier.height / 1.5 && !$li.is( ':last-of-type' ) ) {
                  console.log( 'n' );
                  swap( $li, $li.next() );
                  $li.insertAfter( $li.next() );
               } else if ( position.top < carrier.offsetY - carrier.height / 1.5 && !$li.is( ':first-of-type' ) ) {
                  if (! $li.prev().hasClass( 'fixed' ) ) {
                     console.log( 'p' );
                     swap( $li, $li.prev() );
                     $li.insertBefore( $li.prev() );
                  }
               }

               function swap( $li, swapEl ) {
                  ySwap = swapEl.data( "y" ),
                  yThis = $li.data( "y" );
                  
                  $li.css( { y: ySwap } ).data( { y: ySwap } );
                  swapEl.css( { y: yThis } ).data( { y: yThis } );

                  carrier.offsetY = swapEl.offset().top;

                  dataThis = ko.dataFor( $li[0] );
                  dataThat = ko.dataFor( swapEl[0] );
                  if ( dataThat.index != undefined ) {
                     var tmp = dataThat.index;
                     dataThat.index = dataThis.index;
                     dataThis.index = tmp;                     
                  } else {
                     dataThis.excluded = swapEl.index() > $li.index()
                  }
               }

               return true;
            }
         } );
      }
   };

} );