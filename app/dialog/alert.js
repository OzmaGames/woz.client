define(['durandal/app'], function (app) {
  var me;

  var startValues = {
    marginTop: '-100px',
    opacity: 0,
    display: 'block'
  };
  var midValues = {
    marginTop: '20px',
    opacity: .9
  };
  var endValues = {
    marginTop: 0,
    opacity: 1
  };
  var clearValues = {
    marginTop: '',
    opacity: ''
  };
  var duration = 500;

  var subscription = app.on("alert:show", function (data) {
    var delay = 2000;

    if (typeof data == "string") {
      me.text(data);
    }
    else {
      me.html(data.content);
      delay = data.delay || delay;
    }

    me.css({
      top: ($(window).innerHeight() - me.outerHeight()) / 2,
    });
    
    me.css(startValues);
    me.animate(midValues, duration, 'swing', function () {
      me.animate(endValues, duration / 2, 'swing', function () {
        setTimeout(function () {
          me.fadeOut();
        }, delay);
      });
    });
  });

  return {
    binding: function () {
      return { cacheViews: false };
    },

    compositionComplete: function (el) {
      me = $('.alert', el);
      $(el).appendTo('body');
    },

    detached: function (el) {
      $(el).remove();
      subscription.off();
    }
  }
});