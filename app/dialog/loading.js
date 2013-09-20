define(['durandal/app', 'api/datacontext'], function (app, ctx) {
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

  var subscription = app.on("alert1:show", function (data) {
    me.text(data);
    me.css({
      top: ($(window).innerHeight() - me.outerHeight()) / 2,
    });

    me.css(startValues);
    me.animate(midValues, duration, 'swing', function () {
      me.animate(endValues, duration / 2, 'swing', function () {
        setTimeout(function () {
          me.fadeOut();
        }, 2000);
      });
    });
  });

  ko.bindingHandlers.fadeVisible = {
    init: function (element, valueAccessor) {
      // Initially set the element to be instantly visible/hidden depending on the value
      var value = valueAccessor();
      $(element).toggle(ko.utils.unwrapObservable(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
    },
    update: function (element, valueAccessor) {
      // Whenever the value subsequently changes, slowly fade the element in or out
      var value = valueAccessor();
      ko.utils.unwrapObservable(value) ? $(element).fadeIn(200) : $(element).fadeOut(500);
    }
  };

  return {
    loadingStatus: ctx.loadingStatus,
    loading: ctx.loading,

    binding: function () {
      return { cacheViews: false };
    },

    compositionComplete: function (el) {
      me = $('.loading', el);
      $(el).appendTo('body');
      me.css({
        top: ($(window).innerHeight() - me.outerHeight()) / 2,
      });
    },

    detached: function (el) {
      $(el).remove();
      subscription.off();
    }
  }
});