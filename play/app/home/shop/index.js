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

      activate: function ( id ) {
         return ctx.auth.then( function () {
            app.trigger( "game:dispose" );
            app.dialog.closeAll();
            app.palette.dispose();

            if ( !sessionStorage.getItem( "shop" ) ) {
               sessionStorage.setItem( "shop", 0 );
            } else {
               id = id || "";
               this.activeTab = id.match( /storage/ig ) ? 1 : 0;
            }
         } );
      },

      start: function () {
         app.Sound.play( app.Sound.sounds.click.button );
         app.navigate( "newGame" );
      },

      binding: function () {
         return { cacheViews: false };
      },
      attached: function () {
         app.Sound.play( app.Sound.sounds.pageTransition );

         app.dialog.show("notice", {
            model: {
	             close: function () {
                 app.dialog.close("notice");
               }
            },
            view: 'dialogs/pages/shop',
            css: 'long',
            closeOnClick: false,
            fixed: true,
            centered: true,
            modal: true
        })
      }
   }
});