define(['durandal/app'], function (app) {

  var me, subscription, vm = {
    heading: ko.observable(''),
    content: ko.observable(null),
    close: function () {
      close();
      app.trigger("slipper:dialog-result", 'closed');
    },
    binding: function () {
      return { cacheViews: false };
    },
    compositionComplete: function (el) {
      me = $('.slipper', el);
      $(el).appendTo('body');

      app.woz.dialogs.slipper.resolve();
    },
    detached: function (el) {
      $(el).remove();
      subscription.off();
    }
  }

  function close(duration) {
    if (!me.is(":visible")) return;

    duration = duration || 500;
    var dfd = me.transition({ y: 10 }, duration / 2, 'ease')
      .transition({ y: -100, opacity: 0 }, duration).promise().then(function () {
        me.css({ y: 0, display: 'none' });
      });

    me.parent().removeClass('modal');

    return dfd;
  }

  function show(data) {
    vm.heading(data.heading || '');
    vm.content(data.content);

    if (data.modal === true) {
      me.parent().addClass('modal');
    }

    me.css({ y: -100, display: 'block', opacity: 0 })
      .transition({ y: 10, opacity: 1 }, 500, 'ease')
      .transition({ y: 0 }, 300).promise().then(function () {
        me.css({ y: 0 });
      });
  }

  subscription = app.on("slipper:show", function (data) {
    if (me.is(":visible")) {
      close(200).then(function () { show(data) });
      return;
    }
    show(data);
  });

  return vm;

});