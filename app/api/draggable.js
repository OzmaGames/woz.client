define(['jquery'], function ($) {

  $.fn.draggable = function (opt) {
    opt = $.extend({}, $.fn.draggable.defaults, opt);

    var $el = $(this), zIndex = $el.css('z-index'), hasMoved = false;

    if($.support.touch) $el.touchPunch();

    var events = {
      mousedown: function (e) {
        e.preventDefault(); // disable selection

        if (opt.withinEl) {
          var height = opt.withinEl.innerHeight(), width = opt.withinEl.innerWidth();
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
          windowTop: $(window).scrollTop()
        };
        
        $el.css('z-index', 1000);
        $el.addClass('drag');

        opt.dragStart.call(e);
        if (!$el.data("immovable") || $el.data("immovable")() !== true) { //false or null
          opt.parent.bind("mousemove", startPoint, events.mousemove);          
        }
        opt.parent.one("mouseup", startPoint, events.mouseup);
        return startPoint;
      },

      mouseup: function (e) {
        if (!$el.hasClass('drag')) return;

        opt.parent.unbind("mousemove", events.mousemove)
        $el.css('z-index', zIndex);
        $el.removeClass('drag');

        var isWithin = events.isWithinBoundaries(e);
        var top = isWithin ? (e.data.t + e.pageY) : ($el.position().top),
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

        opt.dropped(e, { top: top, left: left, hasMoved: hasMoved });

        hasMoved = false;
      },

      mousemove: function (e) {
        var newTop = e.pageY + e.data.t,
            newLeft = e.pageX + e.data.l;

        //if (newTop < opt.within.t) newTop = opt.within.t;
        if (newLeft < opt.within.l) newLeft = opt.within.l;
        if (newTop + e.data.h > opt.within.b) newTop = opt.within.b - e.data.h;
        if (newLeft + e.data.w > opt.within.r) newLeft = opt.within.r - e.data.w;

        $el.css({ top: newTop, left: newLeft });

        opt.move(e, { top: newTop, left: newLeft });

        hasMoved = true;

        if (e.data.windowTop != 0 && e.pageY - e.data.windowTop < 100) {
          //var diff = e.pageY - e.data.windowTop;
          e.data.windowTop = e.data.windowTop - 50;
          if (e.data.windowTop < 0) e.data.windowTop = 0;
          $("body").animate({ scrollTop: e.data.windowTop }, "fast");
        }
      },

      isWithinBoundaries: function (e) {
        var newTop = e.pageY + e.data.t,
            newLeft = e.pageX + e.data.l;

        //console.log(newLeft, newTop, opt.within, e.data);

        if (
          newTop < opt.within.t ||
          newTop + e.data.h > opt.within.b ||
          newLeft < opt.within.l ||
          newLeft + e.data.w > opt.within.r)
          return false;

        return true;
      }
    };

    $el.bind({
      mousedown: events.mousedown      
    });

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
    move: function () { },
    parent: $(document),
    dragable: true,
    usePercentage: true,
    cursor: "pointer"
  };

});
