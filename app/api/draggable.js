define( ['jquery'], function ( $ ) {

   $.fn.draggable = function ( opt ) {
      opt = $.extend( {}, $.fn.draggable.defaults, opt );

      var $el = $( this ), hasMoved = false;

      function immovable() {
         return $el.data( "immovable" ) && $el.data( "immovable" )();
      }

      this.immovable = immovable;

      function convertEventForTouch( e ) {
         if ( $.support.touch ) {
            var touch = e.originalEvent.changedTouches[0];

            e.clientX = e.pageX = touch.pageX;
            e.clientY = e.pageY = touch.pageY;

            if ( e.type == "touchstart" ) {
               //wake the hell up paperjs 
               //var el = document.elementFromPoint(e.clientX, e.clientY);
               var el = $( 'canvas' )[0];
               var evt = document.createEvent( 'TouchEvent' );
               evt.initTouchEvent( 'touchstart', true, true,
                  window, 1, e.clientX, e.clientY, e.clientX, e.clientY, false, false, false, false, e.originalEvent.touches, e.originalEvent.targetTouches, e.originalEvent.changedTouches, 1, 0 );

               el.dispatchEvent( evt );
            }

         }
      }

      var events = {
         mousedown: function ( e ) {
            e.preventDefault(); // disable selection            
            e.stopPropagation();

            convertEventForTouch( e );

            if ( opt.withinEl ) {
               var height = opt.withinEl.innerHeight(), width = opt.withinEl.innerWidth(), offset = opt.withinEl.offset();
               opt.within = { l: offset.left, t: offset.top, r: offset.left + width, b: offset.top + height };
            }

            var offset = $el.offset(), startPoint = {
               h: $el.outerHeight(),
               w: $el.outerWidth(),
               t: offset.top - e.pageY,
               l: offset.left - e.pageX,
               parent: $el.parent(),
               scrollTop: opt.parent.scrollTop(),
               scrollTopChanging: 0,
            };
            startPoint.scrollTopTarget = startPoint.scrollTop;

            if ( opt.centerBased ) {
               opt.within.t += startPoint.h / 2;
               opt.within.b += startPoint.h / 2;
               opt.within.l += startPoint.w / 2;
               opt.within.r += startPoint.w / 2;
            }

            opt.dragStart.call( this, e, opt.within );

            if ( !immovable() ) {
               var pointerMove = $.support.touch ? "touchmove" : "mousemove";
               $el.hide();
               $el.addClass( 'drag' ).appendTo( $( '#fixed' ) ).css( { top: offset.top, left: offset.left } );
               $el.show();

               $( document ).bind( pointerMove, startPoint, events.mousemove );
               opt.parent.bind( "scroll", startPoint, events.scroll );
            }
            var pointerUp = $.support.touch ? "touchend" : "mouseup";
            $( document ).one( pointerUp, startPoint, events.mouseup );

            return startPoint;
         },

         mousemove: function ( e ) {
            convertEventForTouch( e );

            var newTop = e.pageY + e.data.t,
                newLeft = e.pageX + e.data.l;

            opt.lastEvent = e;

            if ( opt.topLimit && newTop < opt.within.t ) newTop = opt.within.t;
            if ( newLeft < opt.within.l ) newLeft = opt.within.l;
            if ( newTop + e.data.h > opt.within.b ) newTop = opt.within.b - e.data.h;
            if ( newLeft + e.data.w > opt.within.r ) newLeft = opt.within.r - e.data.w;

            if ( opt.move( e, { top: newTop, left: newLeft } ) ) {
               $el.css( { top: newTop, left: newLeft } );

               hasMoved = true;
               if ( e.pageY < 100 && !e.data.scrollTopChanging ) {
                  var top = opt.parent.scrollTop() - 50;
                  if ( top != -50 ) {
                     if ( top < 0 ) top = 0;

                     e.data.scrollTopChanging = true;
                     opt.parent.animate( { scrollTop: top }, 'fast', function () {
                        e.data.scrollTopChanging = false;
                     } );
                  }
               }
            }
         },

         mouseup: function ( e ) {
            if ( !$el.hasClass( 'drag' ) ) return;
            convertEventForTouch( e );

            if ( $.support.touch ) {
               $el.hide();
               var evt = document.createEvent( 'TouchEvent' ),
                  el = document.elementFromPoint( e.clientX, e.clientY );
               $el.show();
               evt.initTouchEvent( 'touchend', true, true,
                  window, 1, e.clientX, e.clientY, e.clientX, e.clientY, false, false, false, false, e.originalEvent.touches, e.originalEvent.targetTouches, e.originalEvent.changedTouches, 1, 0 );

               el.dispatchEvent( evt );
            } else {
               $el.hide();
               var evt = document.createEvent( 'MouseEvents' ),
                  el = document.elementFromPoint( e.clientX, e.clientY );
               $el.show();
               evt.initMouseEvent( 'mouseup', true, true,
                  window, 1, e.clientX, e.clientY, e.clientX, e.clientY, false, false, false, false, 0, null );

               el.dispatchEvent( evt );
            }

            $( document ).unbind( "mousemove touchmove", events.mousemove )
            opt.parent.unbind( "scroll", events.scroll )

            var startPoint = e.data, scrollTopChange = startPoint.scrollTop - opt.parent.scrollTop();

            //e.data.t += scrollTopChange;
            opt.within.t += scrollTopChange;
            opt.within.b += scrollTopChange;

            var isWithin = events.isWithinBoundaries( e ), topExceeded = false;
            var top = isWithin ? ( e.data.t + e.pageY ) : ( $el.position().top ),
                left = isWithin ? ( e.data.l + e.pageX ) : ( $el.position().left );

            top -= startPoint.parent.offset().top;
            left -= startPoint.parent.offset().left;

            $el.hide();
            $el.removeClass( 'drag' ).appendTo( startPoint.parent ).css( { top: top, left: left } );
            $el.show();
            
            if ( hasMoved ) {
               $el.addClass( "dragged" );
               if ( top < 0 ) {
                  top = 0;
                  if ( !opt.usePercentage && !opt.noTask ) {
                     Task.run( function () {
                        $el.css( { top: 0 } );
                     } );
                  }
               }
               if ( opt.usePercentage ) {
                  top = 100.0 * top / ( opt.within.b - opt.within.t );
                  left = 100.0 * left / ( opt.within.r - opt.within.l );
                  if ( opt.noTask ) {
                     $el.css( {
                        top: top + '%',
                        left: left + '%',
                     } );
                  } else {
                     Task.run( function () {
                        $el.css( {
                           top: top + '%',
                           left: left + '%',
                        } );
                     } );
                  }
               }
            }

            opt.dropped( e, { top: top, left: left, hasMoved: hasMoved, within: opt.within, scrollTopChange: e.data.scrollTopChange, isWithin: isWithin } );

            hasMoved = false;
         },

         scroll: function () {

         },

         isWithinBoundaries: function ( e ) {
            var newTop = e.pageY + e.data.t + e.data.scrollTopChange,
                newLeft = e.pageX + e.data.l;

            if (
              newTop < opt.within.t ||
              newTop + e.data.h > opt.within.b ||
              newLeft < opt.within.l ||
              newLeft + e.data.w > opt.within.r ) {
               return false;
            }

            return true;
         }
      };

      var pointerDown = $.support.touch ? "touchstart" : "mousedown";
      $el.bind( pointerDown, events.mousedown );

      $el.data( 'draggable', this );

      this.dispose = function () {
         $el.unbind();
         events.mouseup();
      };

      return $el.css( 'cursor', opt.cursor );
   }

   $.fn.draggable.defaults = {
      within: { l: 0, r: window.innerWidth, t: 0, b: window.innerHeight },
      withinEl: null,
      dragStart: function () { },
      dropped: function () { },
      move: function () { return true },
      parent: $( '#app' ),
      dragable: true,
      usePercentage: true,
      cursor: "pointer",
      centerBased: false,
      topLimit: false
   };

} );
