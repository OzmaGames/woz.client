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

   var collections = ko.observableArray();
   ctx.user.collections.subscribe( function ( data ) {
      collections( data );
      //collections.push( {
      //   shortName: 'more',
      //   longName: 'More',
      //   desc: '3/15 collections'
      //} );
   } );
   ctx.user.collections.valueHasMutated();

   vm = {
      gameOptions: gameOptions,
      gameOptionId: ko.observable( 0 ),
      collections: collections,
      collection: ko.observable( 'woz' ),
      friends: ko.observableArray(),
      query: ko.observable( '' ),
      friendListMode: ko.observable( mode.list ),
      searchLoading: ko.observable( false ),
      activeFriend: ko.observable(),
      clicked: function () {
         app.Sound.play( app.Sound.sounds.click.button );
         return true;
      },
      friendSelected: function ( friend ) {
         app.Sound.play( app.Sound.sounds.click.button );

         if ( this.activeFriend() == friend ) {
            this.activeFriend( null );
         } else if ( friend.isFriend ) {
            this.activeFriend( friend );
         }
      },
      queryChanged: function ( e ) {
         this.query( e.target.value );
      },
      activate: function () {
         this.activeFriend( null );
         app.dialog.closeAll();
         app.trigger( "game:dispose" );

         app.palette.dispose();
      },
      collectionClicked: function ( collection ) {
         app.Sound.play( app.Sound.sounds.click.button );

         if ( collection.shortName == 'more' ) {
            app.navigate( 'shop' );
         }
         return true;
      },
      binding: function () {
         return { cacheViews: false };
      },
      attached: function () {
         app.Sound.play( app.Sound.sounds.pageTransition );
      },
      addFriend: function ( friend ) {
         app.Sound.play( app.Sound.sounds.click.button );

         var base = this;
         app.trigger( "server:friends", {
            username: ctx.username, command: 'add', friendUsername: friend.username
         }, function () {
            base.query( '' );
         } );
      },
      removeFriend: function ( friend ) {
         app.Sound.play( app.Sound.sounds.click.button );

         var base = this;
         app.trigger( "server:friends", {
            username: ctx.username, command: 'delete', friendUsername: friend.username
         }, function () {
            if ( !base.query() ) {
               base.query.valueHasMutated();
            }
         } );
      },
      start: function () {
         app.Sound.play( app.Sound.sounds.click.button );

         if ( vm.startEnable() ) {
            var gameOptionId = this.gameOptionId();

            ctx.playerCount = gameOptions[gameOptionId].playerCount;

            if ( gameOptionId == 0 ) {
               ctx.friendUsername = this.activeFriend().username;
            } else {
               ctx.friendUsername = "";
               delete ctx.friendUsername;
            }

            ctx.collection.name( vm.collection() );

            app.navigate( "game" )

         } else {
            app.dialog.show( "alert", { content: 'Please select a friend to continue.' } );
         }

      },
      toShop: function () {
         app.Sound.play( app.Sound.sounds.click.button );
         app.navigate( "shop" )
      }
   }

   vm.startEnable = ko.computed( function () {
      var gameOptionId = vm.gameOptionId(), activeFriend = vm.activeFriend();
      return activeFriend || gameOptionId != 0;
   } );

   ko.computed( function () {
      var query = vm.query();
      if ( query == '' ) {
         app.trigger( "server:friends", { username: ctx.username, command: 'getAll' }, function ( data ) {
            vm.friends( [] );
            vm.activeFriend( null );
            vm.friendListMode( mode.list );
            if ( data.success ) {
               data.friends.sort( function ( a, b ) { return a.username > b.username } )
               ko.utils.arrayForEach( data.friends, function ( f ) {
                  f.isFriend = true;
               } );
               vm.friends( data.friends );
               vm.knownFriends = data.friends;
            }
         } );
      } else {
         vm.searchLoading( true );
         app.trigger( "server:friends", {
            username: ctx.username, command: 'search', friendUsername: vm.query()
         }, function ( data ) {
            ko.utils.arrayForEach( data.users, function ( user ) {
               if ( ko.utils.arrayFirst( vm.knownFriends, function ( f ) { return f.username == user.username } ) ) {
                  user.isFriend = true;
               } else {
                  user.isFriend = false;
               }
            } );
            vm.friends( [] );
            vm.activeFriend( null );
            vm.friendListMode( mode.search );
            vm.searchLoading( false );
            vm.friends( data.users );
         } );
      }
   } ).extend( { throttle: 300 } );

   return vm;
} );