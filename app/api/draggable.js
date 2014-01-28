define(['jquery'], function ($) {

   $.fn.draggable = function (opt) {
      opt = $.extend({}, $.fn.draggable.defaults, opt);

      var $el = $(this), hasMoved = false;

      //if ($.support.touch) $el.touchPunch();
      
      function immovable(){
         return $el.data("immovable") && $el.data("immovable")();
      }

      this.immovable = immovable;

      function convertEventForTouch(e) {
         if ($.support.touch) {
            var touch = e.originalEvent.changedTouches[0];

            e.clientX = e.pageX = touch.pageX;
            e.clientY = e.pageY = touch.pageY;

            e.preventDefault();
         }
      }

      var events = {
         mousedown: function (e) {
            e.preventDefault(); // disable selection            
            e.stopPropagation();            
            $el.addClass('drag');

            convertEventForTouch(e);
            if (opt.withinEl) {
               var height = opt.withinEl[0].scrollHeight, width = opt.withinEl.innerWidth();
               var padLeft = parseInt(opt.withinEl.css('padding-left')),
                   padTop = parseInt(opt.withinEl.css('padding-top')),
                   padRight = parseInt(opt.withinEl.css('padding-right')),
                   padBottom = parseInt(opt.withinEl.css('padding-bottom'));
               opt.within = { l: padLeft, t: padTop, r: width - padLeft - padRight, b: height - padTop - padBottom };
            }
            
            var startPoint = {
               h: $el.outerHeight(),
               w: $el.outerWidth(),
               t: $el.position().top - e.pageY,
               l: $el.position().left - e.pageX,
               scrollTop: opt.parent.scrollTop(),
               scrollTopChange: 0,
               scrollTopTarget: 0
            };
            startPoint.scrollTopTarget = startPoint.scrollTop;

            if (opt.centerBased) {
               opt.within.t += startPoint.h / 2;
               opt.within.b += startPoint.h / 2;
               opt.within.l += startPoint.w / 2;
               opt.within.r += startPoint.w / 2;
            }
            
            //$el.css({ left: $el.offset().left, top: $el.offset().top });
            opt.dragStart.call(this, e, opt.within);
            
            if (!immovable()) {
               var pointerMove = $.support.touch ? "touchmove" : "mousemove";
               opt.parent.bind(pointerMove, startPoint, events.mousemove);
               opt.parent.bind("scroll", startPoint, events.scroll);
            }
            var pointerUp = $.support.touch ? "touchend" : "mouseup";
            opt.parent.one(pointerUp, startPoint, events.mouseup);
            return startPoint;
         },

         mouseup: function (e) {
            if (!$el.hasClass('drag')) return;
            convertEventForTouch(e);

            opt.parent.unbind("mousemove touchmove", events.mousemove)
            opt.parent.unbind("scroll", events.scroll)
            $el.removeClass('drag');

            
            var isWithin = events.isWithinBoundaries(e);
            var top = isWithin ? (e.data.t + e.pageY + e.data.scrollTopChange) : ($el.position().top),
                left = isWithin ? (e.data.l + e.pageX) : ($el.position().left);

            if ($el.position().top < opt.within.t) {
               top = opt.within.t;
               $el.css({ top: top });
            }

            if (hasMoved && opt.usePercentage) {
               top = 100.0 * top / (opt.within.b - opt.within.t);
               left = 100.0 * left / (opt.within.r - opt.within.l);
               $el.css({
                  top: top + '%',
                  left: left + '%',
               });
            }

            opt.dropped(e, { top: top, left: left, hasMoved: hasMoved, within: opt.within });

            hasMoved = false;
         },

         scroll: function () {
            opt.lastEvent.data.scrollTopChange = opt.parent.scrollTop() - opt.lastEvent.data.scrollTop;
            events.mousemove(opt.lastEvent);            
         },

         mousemove: function (e) {
            convertEventForTouch(e);
            
            var newTop = e.pageY + e.data.t + e.data.scrollTopChange,
                newLeft = e.pageX + e.data.l;            
            
            opt.lastEvent = e;
            
            if (opt.topLimit && newTop < opt.within.t) newTop = opt.within.t;
            if (newLeft < opt.within.l) newLeft = opt.within.l;
            if (newTop + e.data.h > opt.within.b)  newTop = opt.within.b - e.data.h;
            if (newLeft + e.data.w > opt.within.r) newLeft = opt.within.r - e.data.w;            

            if (opt.move(e, { top: newTop, left: newLeft })) {
               $el.css({ top: newTop, left: newLeft });

               hasMoved = true;               
               if (e.data.scrollTop + e.data.scrollTopChange != 0 && e.pageY < 100) {
                  var currentTop = e.data.scrollTop + e.data.scrollTopChange;

                  if (e.data.scrollTopTarget == currentTop) {
                     var top = currentTop - 50;
                     if (top < 0) top = 0;

                     e.data.scrollTopTarget = top;
                     console.log("scrolled", top);
                     opt.parent.animate({ scrollTop: top }, 'fast', function () {

                     });
                  }
               }
            }
         },

         isWithinBoundaries: function (e) {
            var newTop = e.pageY + e.data.t + e.data.scrollTopChange,
                newLeft = e.pageX + e.data.l;

            if (
              newTop < opt.within.t ||
              newTop + e.data.h > opt.within.b ||
              newLeft < opt.within.l ||
              newLeft + e.data.w > opt.within.r) {               
               return false;
            }

            return true;
         }
      };

      var pointerDown = $.support.touch ? "touchstart" : "mousedown";
      $el.bind(pointerDown, events.mousedown);      

      $el.data('draggable', this);

      this.dispose = function () {
         $el.unbind();
         events.mouseup();
      };

      return $el.css('cursor', opt.cursor);
   }

   $.fn.draggable.defaults = {
      within: { l: 0, r: window.innerWidth, t: 0, b: window.innerHeight },
      withinEl: null,
      dragStart: function () { },
      dropped: function () { },
      move: function () { return true },
      parent: $('#app'),
      dragable: true,
      usePercentage: true,
      cursor: "pointer",
      centerBased: false,
      topLimit: false
   };

});
