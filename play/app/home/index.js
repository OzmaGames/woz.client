define( ['durandal/app', 'durandal/activator', 'api/ui/palette', 'api/datacontext', 'dialogs/templates/panel'],
  function ( app, activator, palette, ctx, panel ) {

     function viewChange( viewModel ) {
        app.loading( true );
        app.dialog.show( "panel-empty", viewModel, {
           compositionComplete: function () {
              $( 'input[autofocus]' ).focus();
              app.loading( false );
           }
        } );
     }

     return {
        activate: function ( route ) {
           palette.get( "menu" ).visible( false );
           palette.get( "currency" ).visible( false );

           this.viewChanger = app.on( 'account:view:change' ).then( viewChange );

           ctx.nextRoute = route;

           //return $.Deferred( function ( dfd ) {
           //   ctx.auth.then( function () {
           //      dfd.reject();
           //      app.navigate('lobby');
           //   }, function () {
           //      dfd.resolve();
           //   } );
           //} ); 
        },

        binding: function () {
           return { cacheViews: false };
        },

        compositionComplete: function () {
           app.trigger( "account:view:change", "account/login" );
        },

        attached: function () {
           app.Sound.play( app.Sound.sounds.pageTransition );
        },

        detached: function ( view ) {
           this.viewChanger.off();
           app.dialog.close( "panel" );
           palette.get( "menu" ).visible( true );
           palette.get( "currency" ).visible( true );
        }
     }
  } );