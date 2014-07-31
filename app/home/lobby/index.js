define( ['durandal/app', 'api/datacontext', './games'], function ( app, ctx, parser ) {

   var gamesDFD = $.Deferred();

   function Index() {
      this.loading = ko.observable( false );
      this.loadingData = ctx.lobby.loading;
      this.unseens = ctx.lobby.unseens;

      this.activeTab = 0;
      this.compose = ko.observable( {
         model: parser,
         view: '',
         cacheViews: false,
      } )
   }

   Index.prototype._navigate = function ( tabIndex ) {
      if ( tabIndex == 0 ) {
         parser.loadOnGoing();
      } else if ( tabIndex == 1 ) {
         parser.loadNotification();
      } else if ( tabIndex == 2 ) {
         parser.loadArchive();
      }
   
      this.compose().view =
         tabIndex == 1 ? 'home/lobby/notifications' : 'home/lobby/games';

      this.compose.valueHasMutated();

      sessionStorage.setItem( "lobby", tabIndex );

      this.loading( false );

      return $.Deferred( function ( dfd ) { Task.run( function () { dfd.resolve(); }, 100 ); } );
   }

   Index.prototype.navEnd = function ( index ) {

   };

   Index.prototype.navSwitch = function ( iFrom, iTo ) {
      if ( iFrom === undefined ) return;

      if ( iFrom == 0 ) {
         ctx.lobby.seenAllOngoing();
      } else if ( iFrom == 1 ) {
         ctx.lobby.seenAll();
      }
   };

   Index.prototype.navigate = function ( tabIndex, dfd ) {
      this.loading( true );
      return dfd.then( this._navigate.bind( this ) );
   };

   Index.prototype.activate = function () {
      return ctx.auth.then( function () {
         app.trigger( "game:dispose" );
         app.dialog.closeAll();
         app.palette.dispose();

         if ( !sessionStorage.getItem( "lobby" ) ) {
            sessionStorage.setItem( "lobby", 0 );
         } else {
            this.activeTab = sessionStorage.getItem( "lobby" );
         }
      });
   };

   Index.prototype.start = function () {      
      app.Sound.play( app.Sound.sounds.click.button );
      app.navigate( "newGame" );
   };

   Index.prototype.binding = function () {
      return { cacheViews: false };
   };

   Index.prototype.attached = function () {
      app.Sound.play( app.Sound.sounds.pageTransition );
   }

   return Index;
} );