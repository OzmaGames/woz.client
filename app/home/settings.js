define( ['plugins/router', 'durandal/app', 'api/datacontext'], function ( router, app, ctx ) {

   return {
      activate: function () {
         return ctx.auth.then( function () {
            app.palette.dispose();
            app.dialog.closeAll();
            app.trigger( "game:dispose" );
         } );
      },
      binding: function () {
         return { cacheViews: false };
      },
      username: ctx.username,
      block: ctx.user.block,
      removeBlocked: function (player) {
         ctx.user.block.del( player.username );
      },
      deleteUsername: function () {
         app.dialog.confirm( "This will delete the account <b>" + ctx.username + "</b> permanently!" ).then( function () {
            app.trigger( "server:account:delete", { username: ctx.username }, function () {
               app.navigate( '' );
            } );
         } )         
      },
      attached: function () {
         app.Sound.play( app.Sound.sounds.pageTransition );
      }
   }
} );