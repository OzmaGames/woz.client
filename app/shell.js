define( ['plugins/router', 'durandal/app'], function ( router, app ) {

   var connected = ko.observable( false );
   var online = ko.observable( false );
   var errors = ko.observableArray();
   var devMode = ko.observable( false );

   app.on( "socket:status" ).then( function ( status ) {
      connected( status == "connect" );
   } );

   app.on( "socket:server" ).then( function ( mode ) { devMode( mode ) } )

   window.addEventListener( "online", function () { online( true ); } );
   window.addEventListener( "offline", function () { online( false ); } );

   window.addEventListener( "error", function ( e ) {
      errors.push( e );
   } );

   return {
      router: router,
      loading: ko.computed( function () {
         return ( router.isNavigating() || app.loading() ) && !app.inlineLoading();
      } ),
      status: {
         cnn: connected,
         online: online,
         devMode: devMode
      },
      errors: errors,
      summary: ko.computed( function () {
         var str = "";
         ko.utils.arrayForEach( errors(), function ( e ) {
            str += e.message;
            str += '\n';
            str += e.lineno + ' ' + e.filename.match( /\/(.*?\.js)/ig )[0]
            str += '\n';
         } );
         return str;
      } ),
      showSummary: function () {
         app.dialog.show( "alert", {
            content: $( '<div/>' ).css( { fontSize: '12px' } ).html( this.summary() )[0].outerHTML,
            delay: 5000
         } );
      },

      activate: function () {
         return router.map( [
            { route: ['', 'home'], moduleId: 'home/index', title: '' },
            { route: 'test', moduleId: 'home/test', title: 'Test' },
            { route: 'lobby', moduleId: 'home/lobby/index', title: 'My Games', nav: true },
            { route: 'shop', moduleId: 'home/shop/index', title: 'Shop', nav: true },
            { route: 'shop/:id', moduleId: 'home/shop/index', title: 'Shop' },
            { route: 'settings', moduleId: 'home/settings', title: 'Settings', nav: true },
            { route: 'sound', moduleId: 'home/sound', title: 'Sound Debugger', nav: true },
            { route: 'newGame', moduleId: 'home/newGame', title: 'New Game', nav: true },
            { route: 'singlePlayer', moduleId: 'home/singlePlayer', title: 'Loading the game' },
            { route: 'nextTutorial', moduleId: 'home/nextTutorial', title: 'Loading the game' },
            { route: 'not-found', moduleId: 'error/not-found', title: 'Not Found' },
            { route: 'game', moduleId: 'game/game', title: 'Play' },
            { route: 'game/:id', moduleId: 'game/game', title: 'Play' },
            { route: 'tutorial', moduleId: 'game/game', title: 'Tutorial', nav: true },
            { route: 'tutorial/:id', moduleId: 'game/game', title: 'Tutorial' },
            { route: 'game-editor', moduleId: 'game-editor/menu', title: 'Game Editor' },
            {
               title: 'Game Editor - Edit',
               route: 'game-editor/edit/:id',
               moduleId: 'game-editor/edit'
            },
            {
               route: 'account*details',
               moduleId: 'account/index',
               title: 'Account Settings',
               hash: '#account'
            },
            { route: 'facebook', moduleId: 'account/oAuth/facebook', title: 'Words of Oz' }
         ] ).buildNavigationModel()
          .mapUnknownRoutes( 'error/not-found', 'not-found' )
          .activate();
      },
      compositionComplete: function () {
         $( '#fixed' ).prependTo( 'body' );
      }
   };
} );