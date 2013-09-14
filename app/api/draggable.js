define(['jquery'], function ($) {

  $.fn.draggable = function (opt) {
    opt = $.extend({}, $.fn.draggable.defaults, opt);

    var $el = $(this), zIndex = $el.css('z-index'), hasMoved = false;

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
          l: $el.position().left - e.pageX
        };

        $el.css('z-index', 1000);
        $el.addClass('drag');

        opt.dragStart.call(e);
        opt.parent.bind("mousemove", startPoint, events.mousemove);
        $(document).one("mouseup", startPoint, events.mouseup);
        //$e.one("mouseup", startPoint, events.mouseup);
      },

      mouseup: function (e) {
        if (!$el.hasClass('drag')) return;

        opt.parent.unbind("mousemove", events.mousemove)
        $el.css('z-index', zIndex);
        $el.removeClass('drag');

        var isWithin = events.isWithinBoundaries(e);

        var top = isWithin ? (e.data.t + e.pageY) : ($el.position().top),
            left = isWithin ? (e.data.l + e.pageX) : ($el.position().left);

        if (hasMoved) {
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

        if (newTop < opt.within.t) newTop = opt.within.t;
        if (newLeft < opt.within.l) newLeft = opt.within.l;
        if (newTop + e.data.h > opt.within.b) newTop = opt.within.b - e.data.h;
        if (newLeft + e.data.w > opt.within.r) newLeft = opt.within.r - e.data.w;

        $el.css({ top: newTop, left: newLeft });

        opt.move(e, { top: newTop, left: newLeft });

        hasMoved = true;
      },

      isWithinBoundaries: function (e) {
        var newTop = e.pageY + e.data.t,
            newLeft = e.pageX + e.data.l;

        if (newTop - e.data.h / 2 < opt.within.t || newTop + e.data.h / 2 > opt.within.b || newLeft - e.data.w / 2 < opt.within.l || newLeft + e.data.w / 2 > opt.within.r)
          return false;

        return true;
      }
    };

    $el.bind({
      mousedown: events.mousedown
    });

    //Clean up garbage        
    $el.data('draggable', this);

    this.dispose = function () {
      $el.unbind("mousedown", events.mousedown);
      $el.unbind("mouseup", events.mouseup);
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
    cursor: "move"
  };

});
