define( ['plugins/router', 'durandal/app', 'api/datacontext'], function ( router, app, ctx ) {

   return {
      activate: function () {
         app.palette.dispose();
      },
      binding: function () {
         return { cacheViews: false };
      },
      username: ctx.username,
      deleteUsername: function () {
         //app.dialog.confirm( "This will delete the account <b>" + ctx.username + "</b> permanently!" ).then( function () {
         //   app.trigger( "server:account:delete", { username: ctx.username }, function () {
         //      app.navigate( '' );
         //   } );
         //} )         
      },
      attached: function () {
         app.Sound.play( app.Sound.sounds.pageTransition );
      }
   }
} );