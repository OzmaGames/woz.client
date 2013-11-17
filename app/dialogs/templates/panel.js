define(['durandal/app'], function (app) {
  
  return {
    activate: function (moduleName) {
      if (!moduleName) return;
      this.modelName(moduleName);
    },

    bindingComplete: function (view) {
      var dialog = $('.panel', view).hide();
      return { cacheViews: false };
    },

    compositionComplete: function (view) {      
      var dialog = $('.panel', view);
      var height = $(window).innerHeight();
      dialog.css({ marginTop: (height - dialog.outerHeight()) / 2 }).show();
      dialog.css({ y: -100, opacity: 0 }).transition({ y: 10, opacity: 1 }).transition({ y: 0 });
    },

    modelName: ko.observable()
  };
});