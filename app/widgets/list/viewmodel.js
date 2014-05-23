define( 'widgets/list/viewmodel', ['durandal/composition', 'api/draggable'], function ( composition, draggable ) {

   var ctor = function () { };

   ctor.prototype.activate = function ( settings ) {
      this.settings = settings;
      this.settings.splitters = this.settings.splitters || [];
      this.afterRenderItem = this.afterRenderItem.bind( this );
   };

   ctor.prototype.afterRenderItem = function ( elements, item ) {
      if ( this.settings.draggable ) {
         draggable.call(this, elements );
      }

      //var parts = composition.getParts( elements );
      //$( parts.item ).parent( 'li' ).hide().slideDown( 500 );
   };

   ctor.prototype.bindingComplete = function ( el ) {
      for ( var i = 0, splitter; splitter = this.settings.splitters[i++]; ) {
         if ( splitter.index && i - 1 != splitter.index ) {            
            var $liList = $( 'li', el );
            var $li = $( $liList[i - 1] ), $after = $( $liList[splitter.index] );

            $li.insertAfter( $after );
         }
      }
   }

   return ctor;

   function draggable( elements ) {
      var base = this;

      var parts = composition.getParts( elements );
      var $item = $( parts.item ), $li = $item.parent( 'li' ), $ul = $li.parent();

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
               var prev = $li.prev();
               if ( !prev.hasClass( 'fixed' ) ) {
                  console.log( 'p' );
                  swap( $li, prev );
                  $li.insertBefore( prev );
               }
            }

            function swap( $li, swapEl ) {
               ySwap = swapEl.data( "y" ),
               yThis = $li.data( "y" );

               $li.css( { y: ySwap } ).data( { y: ySwap } );
               swapEl.css( { y: yThis } ).data( { y: yThis } );

               carrier.offsetY = swapEl.offset().top;
               
               if ( base.settings.moved ) {
                  var dataThis = ko.dataFor( $li[0] );
                  var dataThat = ko.dataFor( swapEl[0] );
                  base.settings.moved( dataThis, dataThat, $li.index(), swapEl.index() );
               }               
            }

            return true;
         }
      } );
   }

} );