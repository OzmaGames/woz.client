define(['durandal/app'], function (app) {

   var dialog, sub;

   function adjust() {
      
      if (!dialog) return;
      var height = app.el.clientHeight;
      var top = (height - dialog.outerHeight()) / 2;      

      dialog.transition({ top: top });

   }

   return {
      activate: function (moduleName) {
         if (!moduleName) return;
         this.modelName(moduleName);
         sub = app.on("app:resized:hook").then(adjust);
      },

      bindingComplete: function (view) {
         var dialog = $('.panel', view).hide();
         return { cacheViews: false };
      },

      compositionComplete: function (view) {
         dialog = this.el = $('.panel', view);
         var height = app.el.clientHeight;
         var top = (height - dialog.outerHeight()) / 2;
         dialog.css({ y: top }).show();
         dialog.css({ y: top - 100, opacity: 0 }).transition({ y: top + 10, opacity: 1 }).transition({ y: top }).promise().then(function () {
            dialog.css({ y: 0, top: top });
         });
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