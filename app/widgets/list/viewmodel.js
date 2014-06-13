define( 'widgets/list/viewmodel', ['durandal/composition', 'api/draggable'], function ( composition, draggable ) {

   var ctor = function () { };

   ctor.prototype.activate = function ( settings ) {
      this.settings = settings;
      this.settings.splitters = this.settings.splitters || [];
      this.afterRenderItem = this.afterRenderItem.bind( this );
   };

   ctor.prototype.afterRenderItem = function ( elements, item ) {
      if ( this.settings.draggable ) {
         draggable.call( this, elements );
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

   function initDraggable( $ul ) {
      if ( $ul.data( 'draggable' ) ) return;

      var h = $ul.height(), w = $ul.width(), items = [];

      $ul.css( { height: h, width: w } );
      $( $( 'li', $ul ).get().reverse() ).each( function () {
         var $li = $( this ), $phrase = $li.children( '.phrase, .container' );
         var yPos = $phrase.position().top, xPos = $phrase.position().left,
            w = $phrase.outerWidth(), h = $li.outerHeight();

         items.unshift( {
            yPos: yPos,
            xPos: xPos,
            h: h
         } );

         $phrase.css( { position: 'absolute', width: w, top: yPos, left: xPos } );

         $li.css( {
            height: h
         } ).data( { top: yPos, height: h } );
         
      } );

      $ul.addClass( 'drag' ).data( 'draggable', items );
   }

   function animate( $ul ) {
      $( '.container, .phrase', $ul ).each( function () {
         var $li = $( this ).parent();
         $( this ).css( { top: $li.data( 'top' ) } );
      } );
   }

   function updateCarrier( $li, carrier ) {
      carrier = carrier || {};

      carrier.offsetY = $li.offset().top;
      carrier.height = $li.height();
      carrier.prevHeight = $li.prev().height();
      carrier.nextHeight = $li.next().height();
      carrier.HiBound = carrier.offsetY + ( carrier.height + carrier.nextHeight ) / 3;
      carrier.LoBound = carrier.offsetY - ( carrier.height + carrier.prevHeight ) / 3;
      
      return carrier;
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
         noTask: true,

         dragStart: function ( e, within, startPoint ) {
            within.t -= 20;
            within.b += 20;
            within.r -= 2;

            startPoint.dropzone = $ul;

            initDraggable( $ul );
            $li.addClass( 'hole' );

            carrier = updateCarrier( $li, carrier );
         },

         dropped: function () {
            $li.removeClass( 'hole' );
            Task.run( function () {
               $phrase.css( { top: $li.data( 'top' ) } );
            } )            
         },

         move: function ( e, position ) {            

            if ( position.top > carrier.HiBound && !$li.is( ':last-of-type' ) ) {
               console.log( 'n' );
               swap( $li, $li.next() );
               $li.insertAfter( $li.next() );
               updateCarrier( $li, carrier );
               animate( $ul );
            } else if ( position.top < carrier.LoBound && !$li.is( ':first-of-type' ) ) {
               var prev = $li.prev();
               if ( !prev.hasClass( 'fixed' ) ) {
                  console.log( 'p' );
                  swap( $li, prev );
                  $li.insertBefore( prev );
                  updateCarrier( $li, carrier );
                  animate( $ul );
               }
            }

            function swap( $li, swapEl ) {

               var dataLi = $li.data();
               var dataSw = swapEl.data();

               var hiEl = dataLi.top > dataSw.top ? $li : swapEl;
               var loEl = dataLi.top < dataSw.top ? $li : swapEl;
               
               var tmp = hiEl.data('top');
               hiEl.data( 'top', loEl.data( 'top' ) );
               loEl.data( 'top', tmp + hiEl.data( 'height' ) - loEl.data( 'height' ) );
               
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