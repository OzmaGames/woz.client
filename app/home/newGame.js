define( ['durandal/app', 'api/datacontext'], function ( app, ctx ) {

   var gameOptions = [
      {
         id: 0,
         title: 'play with friend',
         description: 'Choose from my friends list',
         playerCount: 2,
         className: 'icon-group'
      }, {
         id: 1,
         title: 'random opponent',
         description: 'Find an opponent automatically',
         playerCount: 2,
         className: 'icon-random'
      }, {
         id: 2,
         title: 'single play',
         description: 'Compete with yourself',
         playerCount: 1,
         className: 'icon-user'
      }
   ];

   var mode = {
      list: {
         mode: 'list',
         title: 'Friends List'
      }, search: {
         mode: 'search',
         title: 'Search Result'
      }
   };

   var ctor = function () {
      this.gameOptions = gameOptions;
      this.gameOptionId = ko.observable( 0 );
      this.collections = ctx.user.collections;
      this.collection = ko.observable( 'woz' );
      this.friends = ko.observableArray();
      this.query = ko.observable( '' );
      this.friendListMode = ko.observable( mode.list );
      this.searchLoading = ko.observable( false );
      this.activeFriend = ko.observable();

      this.startEnable = ko.computed( function () {
         var gameOptionId = this.gameOptionId(), activeFriend = this.activeFriend();
         return activeFriend || gameOptionId != 0;
      }, this );

      var vm = this;
      vm.query.subscribe( function ( query ) {
         if ( !query ) {
            ctx.user.friends.load().then( function ( friends ) {
               vm.friends( friends );
            } );            
         }
      } );
      vm.query.notifySubscribers();

      ko.computed( function () {
         var query = vm.query();
         if ( query != '' ) {
            vm.searchLoading( true );
            ctx.user.friends.search( vm.query() ).then( function ( users ) {
               vm.activeFriend( null );
               vm.friendListMode( mode.search );
               vm.friends( users );
               vm.searchLoading( false );
            } );
         } else {
            vm.activeFriend( null );
            vm.friendListMode( mode.list );
         }
      } ).extend( { throttle: 300 } );
   };

   ctor.prototype.clicked = function () {
      app.Sound.play( app.Sound.sounds.click.button );
      return true;   //important for radio button
   }

   ctor.prototype.friendSelected = function ( friend ) {
      app.Sound.play( app.Sound.sounds.click.button );

      if ( this.activeFriend() == friend ) {
         this.activeFriend( null );
      } else if ( friend.isFriend ) {
         this.activeFriend( friend );
      }
   };

   ctor.prototype.queryChanged = function ( e ) {
      this.query( e.target.value );
   };


   ctor.prototype.activate = function () {
      this.activeFriend( null );
      app.dialog.closeAll();
      app.trigger( "game:dispose" );

      app.palette.dispose();
   };

   ctor.prototype.collectionClicked = function ( collection ) {
      app.Sound.play( app.Sound.sounds.click.button );

      if ( collection.shortName == 'more' ) {
         app.navigate( 'shop' );
      }
      return true;
   };

   ctor.prototype.binding = function () {
      return { cacheViews: false };
   };

   ctor.prototype.attached = function () {
      app.Sound.play( app.Sound.sounds.pageTransition );
   };

   ctor.prototype.addFriend = function ( friend ) {
      app.Sound.play( app.Sound.sounds.click.button );

      var base = this;
      ctx.user.friends.add( friend.username ).then( function ( json ) {
         base.query( '' );
      } );
   };

   ctor.prototype.removeFriend = function ( friend ) {
      app.Sound.play( app.Sound.sounds.click.button );

      var base = this;
      app.trigger( "server:friends", {
         username: ctx.username, command: 'delete', friendUsername: friend.username
      }, function () {
         if ( !base.query() ) {
            base.query.valueHasMutated();
         }
      } );
   };

   ctor.prototype.start = function () {
      app.Sound.play( app.Sound.sounds.click.button );

      if ( this.startEnable() ) {
         var gameOptionId = this.gameOptionId();

         ctx.playerCount = gameOptions[gameOptionId].playerCount;

         if ( gameOptionId == 0 ) {
            ctx.friendUsername = this.activeFriend().username;
         } else {
            ctx.friendUsername = "";
            delete ctx.friendUsername;
         }

         ctx.collection.name( this.collection() );

         app.navigate( "game" )

      } else {
         app.dialog.show( "alert", { content: 'Please select a friend to continue.' } );
      }

   };

   ctor.prototype.toShop = function () {
      app.Sound.play( app.Sound.sounds.click.button );
      app.navigate( "shop" )
   }

   return ctor;
} );