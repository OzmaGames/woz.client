define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   return {
      loading: ko.observable(false),

      module: ko.observable(),

      activeTab: 0,

      close: function () { },

      navigate: function (tabIndex, dfd) {
         var base = this;
         base.loading(true);

         tabIndex *= 1;

         return dfd.then(function () {
            //base.module(null);
            base.module( tabIndex === 0 ? 'home/poem/my' : 'home/poem/friends' );
            
            base.loading(false);
         });
      },

      activate: function ( id ) {
         return ctx.auth.then( function () {
            app.trigger( "game:dispose" );
            app.dialog.closeAll();
            app.palette.dispose();
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
      }
   }
});