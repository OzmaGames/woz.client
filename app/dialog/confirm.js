define(['durandal/app'], function (app) {
  var me;

  var startValues = {
    bottom: '-100px',
    opacity: 0,
    display: 'block'
  };
  var midValues = {
    bottom: '20px',
    opacity: .9
  };
  var endValues = {
    bottom: 0,
    opacity: 1
  };
  var clearValues = {
    bottom: '',
    opacity: ''
  };
  var duration = 400;

  var close = function () {
    if (!me.is(":visible")) return;

    me.css(endValues);
    me.animate(midValues, duration / 2, 'swing', function () {
      me.animate(startValues, duration, 'swing', function () {
        me.hide().css(clearValues);
      });
    });
    me.parent().removeClass('modal');
  }

  var subscription = app.on("confirm:show", function (data) {

    if (data && data.close) {
      close();
      return;
    }

    if (me.is(":visible")) return;

    if (data && data.modal === true) {
      me.parent().addClass('modal');
    }

    me.css(startValues);
    me.animate(midValues, duration, 'swing', function () {
      me.animate(endValues, duration / 2, 'swing', function () {
        me.css(clearValues);
      });
    });
  });



  return {
    ok: function () {
      app.trigger("confirm:dialog-result", 'ok');
      close();
    },

    cancel: function () {
      app.trigger("confirm:dialog-result", 'cancel');
      close();
    },

    binding: function () {
      window.app = app;
      return { cacheViews: false };
    },

    compositionComplete: function (el) {
      me = $('.confirm', el);
      $(el).appendTo('body');
    },

    detached: function (el) {
      $(el).remove();
      subscription.off();
    }
  }
});