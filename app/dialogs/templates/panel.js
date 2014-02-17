﻿define(['durandal/app'], function (app) {

   var dialog, sub;

   function adjust() {
      
      if (!dialog) return;
      var height = window.innerHeight;
      var top = (height - dialog.outerHeight()) / 2;      
      if (top < 0) return;
      
      dialog.css({ y: top });      
   }

   return {
      activate: function (moduleName) {
         if (!moduleName) return;
         this.modelName(moduleName);
         sub = app.on("app:resized").then(adjust);
      },

      bindingComplete: function (view) {
         var dialog = $('.panel', view).hide();
         return { cacheViews: false };
      },

      compositionComplete: function (view) {
         dialog = this.el = $('.panel', view);
         var height = window.innerHeight;
         var top = (height - dialog.outerHeight()) / 2;
         dialog.css({ y: top }).show();
         dialog.css({ y: top - 100, opacity: 0 })
            .transition({ y: top + 10, opacity: 1 })
            .transition({ y: top });
      },

      canDeactivate: function () {
         sub.off();
         return this.el.fadeOut("fast").promise()
      },

      modelName: ko.observable(),

      loading: app.loading,

      attributes: {
         fixed: false,
         singleton: true
      }
   };
});