define( ['durandal/app', 'durandal/activator', 'api/ui/palette', 'api/datacontext', 'dialogs/templates/panel'],
  function ( app, activator, palette, ctx, panel ) {
    
     function viewChange( viewModel ) {
        app.loading( true );
        app.dialog.show( "panel", viewModel, {
           compositionComplete: function () {
              $( 'input[autofocus]' ).focus();
              app.loading( false );
           }
        } );

     }

     return {
        activate: function () {
           palette.get( "menu" ).visible( false );
           palette.get( "currency" ).visible( false );

           this.viewChanger = app.on( 'account:view:change' ).then( viewChange );
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