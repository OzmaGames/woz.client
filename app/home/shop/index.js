define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   return {
      loading: ko.observable(false),

      module: ko.observable(),

      mode: ko.observable(),

      activeTab: 0,

      close: function () { },

      navigate: function (tabIndex, dfd) {
         var base = this;
         base.loading(true);

         tabIndex *= 1;

         return dfd.then(function () {
            base.module(null);
            base.module(tabIndex === 0 ? 'home/shop/expansion' : 
                        tabIndex === 2 ? 'home/shop/currency' : 'home/shop/storage' );

            base.mode(tabIndex);
            base.loading(false);
         });
      },

      activate: function (id) {
         app.trigger("game:dispose");
         app.dialog.closeAll();
         app.palette.dispose();

         if (!sessionStorage.getItem("shop")) {
            sessionStorage.setItem("shop", 0);
         } else {
            id = id || "";
            this.activeTab = id.match( /storage/ig ) ? 1 : 0;
         }
      },

      start: function () {
         app.navigate( "newGame" );
      },

      binding: function () {
         return { cacheViews: false };
      }
   }
});