define( ['durandal/app', 'api/datacontext'], function ( app, ctx ) {

   var notificationsPerPage = 15;
   var gamesPerPage = 10;

   var archive = ko.observableArray();
   var onGoings = ko.observableArray();
   var notifications = ko.observableArray();
   notifications.queue = new Task.Queue();
   notifications.show = function ( elem ) {
      if ( elem.nodeType === 1 ) {
         $( elem ).hide();
         notifications.queue.runAfter( function () {
            $( elem ).slideDown()
         }, 150 );
      }
   }

   var forGames = {};
   forGames.queue = new Task.Queue();
   forGames.show = function ( elem ) {
      //if ( elem.nodeType === 1 ) {
      //   $( elem ).hide();
      //   forGames.queue.runAfter( function () {
      //      $( elem ).slideDown();
      //   }, 150 );
      //}
   }

   var nVisibleNotifications = ko.observable( notificationsPerPage );
   nVisibleNotifications.subscribe( function () {
      ctx.lobby.notifications.valueHasMutated();
   } );
   var nVisibleGames = ko.observable( gamesPerPage );
   nVisibleGames.subscribe( function () {
      ctx.lobby.games.valueHasMutated();
   } );

   ctx.lobby.notifications.subscribe( function ( games ) {

      notifications().splice( 0, notifications().length );

      for ( var i = 0; games[i]; i++ ) {
         var g = games[i];
         g.notificationSummary = getNotification( g );
         if ( g.over || g.newGame ) {
            if ( nVisibleNotifications() > notifications().length ) {
               notifications().push( g );
            } else {
               break;
            }
         }
      }

      notifications.valueHasMutated();
   } );

   ctx.user.storage.subscribe( function () {
      ctx.lobby.games.valueHasMutated();
   } );

   ctx.lobby.games.subscribe( function ( games ) {
      onGoings.removeAll();
      archive.removeAll();
      var storage = ctx.user.storage()

      ko.utils.arrayForEach( games, function ( g ) {
         if ( !g.summary ) g.summary = getSummary( g );

         if ( !g.resigned ) {
            if ( g.over ) {
               if ( storage == 0 || ( storage > archive().length && nVisibleGames() > archive().length ) ) {
                  archive().push( g );
               }
            } else {
               if ( nVisibleGames() > onGoings().length ) {
                  onGoings().push( g );
               }
            }
         }
      } );

      onGoings.valueHasMutated();
      archive.valueHasMutated();
   } );

   var res = {
      playedWith: 'Played with {{opponent}} - Using {{collection}} collection',
      playedSolo: 'Played solo - Using {{collection}} collection',
      gameEnded: 'Game ended {{modDate, date}}',
      gameStarted: 'Game started {{modDate, date}}',
      phrasePlaced: '{{lastPlayer}} placed: {{lastPhrase}} for {{lastScore}} points',
      noPhrase: 'has not been played yet',
      playerScored: '{{winner}} scored {{winnerScore}} points.',
      playerWon: '{{winner}} won the game with {{winnerScore}} over {{loserScore}} points.'
   }

   var augments = {
      collection: function ( g, style ) {
         return $( "<span/>", { 'class': 'collection', text: g.collection.longName } ).get( 0 ).outerHTML;
      },
      opponent: function ( g, style ) {
         return $( "<span/>", { 'class': 'bold', text: getOpponent( g ).username } ).get( 0 ).outerHTML;
      },
      modDate: function ( g, style ) {
         if ( style == "date" ) {
            var el = $( "<span/>", { 'class': 'date' } );
            ko.bindingHandlers.date.init( el, function () { return g.modDate; } );
            return el.get( 0 ).outerHTML;
         }
      },
      lastPlayer: function ( g, style ) {
         return g.lastPhrase.username == ctx.username ? 'You' :
            $( "<span/>", { 'class': 'bold', text: g.lastPhrase.username } ).get( 0 ).outerHTML;
      },
      lastPhrase: function ( g, style ) {
         return $( "<span/>", { 'class': 'phrase', text: g.lastPhrase.phrase } ).get( 0 ).outerHTML;
      },
      lastScore: function ( g, style ) {
         return $( "<span/>", { 'class': 'point', text: g.lastPhrase.score } ).get( 0 ).outerHTML;
      },
      winner: function ( g, style ) {
         var winner = getWinner( g );
         if ( winner.username == ctx.username ) return 'You';
         return $( "<span/>", { 'class': 'bold', text: winner.username } ).get( 0 ).outerHTML;
      },
      loser: function ( g, style ) {
         var loser = getLoser( g );
         if ( loser.username == ctx.username ) return 'You';
         return $( "<span/>", { 'class': 'bold', text: loser.username } ).get( 0 ).outerHTML;
      },
      winnerScore: function ( g, style ) {
         var winner = getWinner( g );
         return $( "<span/>", { 'class': 'point', text: winner.score } ).get( 0 ).outerHTML;
      },
      loserScore: function ( g, style ) {
         var loser = getLoser( g );
         return $( "<span/>", { 'class': 'point', text: loser.score } ).get( 0 ).outerHTML;
      },
      player: function () {
         return $( "<span/>", { 'class': 'bold', text: 'You' } ).get( 0 ).outerHTML;
      },
      creator: function ( g ) {
         return g.creator == ctx.username ? 'You' :
            $( "<span/>", { 'class': 'bold', text: g.creator } ).get( 0 ).outerHTML;
      },
   }

   function getNotification( g ) {
      var str = resolveRes( "{{modDate, date}} ", g );
      if ( g.newGame ) {
         return str + resolveRes( "{{creator}} has started a game with you.", g );
      } else {
         if ( g.resigned ) {
            if ( getWinner( g ).username == ctx.username ) {
               return str + resolveRes( "{{loser}} resigned from your game.", g );
            } else {
               return str + resolveRes( "{{loser}} resigned from a game against {{winner}}.", g );
            }

         } else {
            if ( g.over ) {
               if ( getWinner( g ).username == ctx.username ) {
                  return str + resolveRes( 'You won a game against {{opponent}}. Score: {{winnerScore}} over {{loserScore}} points.', g );
               } else {
                  return str + resolveRes( 'You lost a game against {{opponent}}. Score: {{winnerScore}} over {{loserScore}} points.', g );
               }
            }
         }
      }
   }

   function getSummary( g ) {
      return [
         g.playerCount > 1 ? resolveRes( res.playedWith, g ) : resolveRes( res.playedSolo, g ),
         g.over ? resolveRes( res.gameEnded, g ) : resolveRes( res.gameStarted, g ),
         g.over ?
            g.playerCount > 1 ? resolveRes( res.playerWon, g ) : resolveRes( res.playerScored, g ) :
            g.lastPhrase.username ? resolveRes( res.phrasePlaced, g ) : resolveRes( res.noPhrase, g )
      ];
   }

   function getPlayer( game ) {
      return game.players[0].username === ctx.username ? game.players[0] : game.players[1];
   }

   function getOpponent( game ) {
      return game.players[0].username === ctx.username ? game.players[1] : game.players[0];
   }

   function getWinner( game ) {
      return game.players.length == 1 ? game.players[0] :
         game.resigned ? ( game.players[0].resigned ? game.players[1] : game.players[0] ) :
         game.players[0].score > game.players[1].score ? game.players[0] : game.players[1];
   }

   function getLoser( game ) {
      return game.players.length == 1 ? game.players[0] :
         game.resigned ? ( game.players[0].resigned ? game.players[0] : game.players[1] ) :
         game.players[0].score < game.players[1].score ? game.players[0] : game.players[1];
   }

   function resolveRes( str, g ) {
      return str.replace( /\{\{([a-z]*),?\s*([a-z]*)\}\}/gi, function ( match, key, style, index, str ) {
         return augments[key]( g, style );
      } );
   }

   function Games() {

      this.loading = ctx.lobby.loading;
      this.activeGame = ko.observable();
      this.type = ko.observable();
      this.notifications = notifications;

      this.gotoShopStorage = function () {
         app.navigate( "shop/storage" );
      }

      var base = this;

      this.forGames = forGames;

      this.binding = function () {
         ctx.lobby.games.valueHasMutated();
         ctx.lobby.notifications.valueHasMutated();
         app.trigger( "lobby:update" );

         return { cacheViews: false };
      }

      this.detached = function () {
         console.log( 'detached' );
      }

      this.loadNotification = function () {
         nVisibleNotifications( notificationsPerPage );
         base.type( "notification" );
      }

      this.loadOnGoing = function () {
         nVisibleGames( gamesPerPage );
         base.list( base.ongoing );
         base.type( "ongoing" );
      }

      this.loadArchive = function () {
         nVisibleGames( gamesPerPage );
         base.list( base.archive );
         base.type( "archive" );
      }

      this.list = ko.observableArray();
      this.ongoing = [
           {
              title: 'My Turn',
              empty: 'You have no ongoing games where it\'s your turn.',
              games: ko.computed( function () {
                 return ko.utils.arrayFilter( onGoings(), function ( g ) {
                    return getPlayer( g ).active;
                 } )
              } )
           }, {
              title: 'Their Turn',
              empty: 'You have no ongoing games where it\'s your opponents turn.',
              games: ko.computed( function () {
                 return ko.utils.arrayFilter( onGoings(), function ( g ) {
                    return !getPlayer( g ).active;
                 } )
              } )
           }
      ];

      this.archive = [
            {
               title: 'two player',
               empty: 'You have not finished any game.',
               games: ko.computed( function () {
                  return ko.utils.arrayFilter( archive(), function ( g ) {
                     return g.players.length == 2;
                  } )
               } )
            }, {
               title: 'Single player',
               empty: 'You have not finished any game.',
               games: ko.computed( function () {
                  return ko.utils.arrayFilter( archive(), function ( g ) {
                     return g.players.length == 1;
                  } )
               } )
            }
      ]

      this.nextPageNotifications = function () {
         var base = this;
         nVisibleNotifications( nVisibleNotifications() + notificationsPerPage );

         return Task.run.call( this, function () {
            return nVisibleNotifications() < ctx.lobby.notifications().length;
         }, 150 * notificationsPerPage );
      };

      this.nextPageGames = function () {
         var base = this;
         nVisibleGames( nVisibleGames() + gamesPerPage );

         return Task.run.call( this, function () {
            return nVisibleGames() < ctx.lobby.games().length;
         }, 150 * gamesPerPage );
      };

      this.storage = ctx.user.storage;

      this.archiveStorageVisibility = ko.computed( function () {
         return ctx.user.storage() <= archive().length && ctx.user.storage() != 0;
      } );

      this.selectGame = function ( game ) {
         if ( game.resigned || ( game.newGame && game.over ) ) return;
         base.activeGame( game );
         app.navigate( "game/" + game.gameID );
      }

      this.resign = function ( game ) {
         var base = this;
         app.dialog.show( "confirm", {
            content: "Are you sure you want to delete this game?", modal: true,
            doneText: 'Delete', cancelText: 'No'
         } ).then( function ( res ) {
            if ( res == "done" ) {
               app.Sound.play( app.Sound.sounds.game.del );
               app.trigger( "server:game:resign", {
                  username: ctx.username,
                  gameID: game.gameID,
               }, function () {

               } );
            }
         } );
      }

      this.message = ko.observable();
   }

   return new Games();
} );