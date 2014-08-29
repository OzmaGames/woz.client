define( ['durandal/app', 'durandal/system', 'api/datacontext'], function ( app, system, ctx ) {

   return {
      loading: ko.observable( false ),

      module: ko.observable(),

      activeTab: 0,

      close: function () { },

      navigate: function ( tabIndex, dfd ) {
         var base = this;
         base.loading( true );

         return {
            moduleId: ( +tabIndex === 0 ) ? 'home/poem/my' : 'home/poem/friends',
            acquired: function ( model ) {
               base.loading( false );
               base.module( model );
            }
         }
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
         app.navigate( "lobby" );
      },

      binding: function () {
         return { cacheViews: false };
      },

      attached: function () {
         app.Sound.play( app.Sound.sounds.pageTransition );
      }
   }
} );