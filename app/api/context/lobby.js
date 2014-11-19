define( 'api/context/lobby', ['durandal/app', './storage'], function ( app, Storage ) {

   var version = 0.54;

   Object.beget = ( function ( Function ) {
      return function ( Object ) {
         Function.prototype = Object;
         return new Function;
      }
   } )( function () { } );

   return new Lobby();

   function Lobby() {
      var base = this, _user, storage;

      this.games = ko.observableArray();
      this.notifications = ko.observableArray();

      this.loading = ko.observable( false );

      var unseenUpdate = ko.observable( 0 );
      this.unseens = ko.computed( function () {
         var games = base.notifications(); unseenUpdate();
         return ko.utils.arrayFilter( games, function ( g ) { return !g.seen && ( g.over || ( !g.over && g.newGame ) ); } ).length;
      } );

      this.seenAll = function () {
         ko.utils.arrayForEach( base.notifications(), function ( game ) {
            game.seen = true;
            delete game.changed;
         } );
         saveChanges();
         unseenUpdate( unseenUpdate() + 1 );
      }

      this.seenAllOngoing = function () {
         ko.utils.arrayForEach( base.games(), function ( game ) {
            game.seenOngoing = true;
            delete game.changed;
         } );
         saveChanges();
      }

      this.games.subscribe( function ( games ) {
         var notifications = base.notifications();
         for ( var i = 0, game; game = games[i++]; ) {
            if ( game.playerCount == 2 ) {
               var exist = ko.utils.arrayFirst( notifications, function ( ntf ) { return ntf.gameID == game.gameID; } );
               if ( !exist ) {
                  if ( !game.seen ) app.Sound.play( app.Sound.sounds.notification );

                  notifications.push( game );
                  if ( !game.isPlayerCreator ) {
                     var copy = Object.beget( game );
                     copy.newGame = true;
                     copy.seen = !!game.seen;
                     copy.modDate = copy.creationDate;
                     notifications.push( copy );
                  }
               }
            }
         }
         sortGames( notifications );
         base.notifications.valueHasMutated();
      } );

      function pullGames() {
         if ( !storage ) return;
         //if ( base.loading() ) return;
         
         var since = storage.since.load();

         if ( since && !base.games().length ) {
            //if list is empty, fill it with local stored games while waiting            
            base.games( polish( storage.games.loadCopy() ) );
         }

         base.loading( true );
         app.trigger( "server:lobby", { username: _user.username, modDate: since }, function ( data ) {
            
            if ( data.success ) {
               removeGames( data.deletedIDs );
               if ( data.games.length ) {
                  publishGames( data.games );
               }                          
            }
            base.loading( false );
         } );
      }

      function userAuthenticated( user ) {
         base.games.removeAll();
         base.notifications.removeAll();

         if ( _user = user, _user.online ) {
             storage = new Storage("lobby[" + _user.username + "]", version, { "games": [], "since": 0 });
             //storage.removeAll();
         }
      }

      app.on( "user:authenticated" ).then( userAuthenticated );

      app.on( "account:login" ).then( function ( json ) {
         userAuthenticated( { username: json.username, online: 1 } );
         pullGames();
      } );

      app.on( "lobby:update" ).then( function () {
         pullGames();
      } );

      app.on( "game:update" ).then( function ( json ) {
         var g = ko.utils.arrayFirst( base.games(), function ( game ) { return game.gameID == json.gameID; } );
         if ( g ) {
            var oldSeen = g.seen;

            g.over = json.over;
            g.players = json.players;
            g.modDate = +new Date();
            g.local = true;
            markAsChanged( g );
            polish( [g] );

            if ( !g.resigned ) {
               g.lastPhrase = {
                  phrase: ko.utils.arrayMap( json.path.phrase, function ( p ) { return p.lemma } ).join( ' ' ),
                  score: json.path.score.total,
                  username: json.path.username
               };
               g.seenOngoing = ( json.path.username == _user.username );
            }
            if ( !g.over ) g.seen = oldSeen;

            var pos = base.games.indexOf( g );
            base.games().splice( pos, 1 );
            base.games().unshift( g );

            saveChanges();

            base.games.valueHasMutated();

            if ( g.over && g.players.length == 2 ) {
               base.notifications.valueHasMutated();
            }
         }
      } );

      app.on( "game:started" ).then( function ( data ) {
         var game = ko.utils.arrayFirst( base.games(), function ( game ) { return game.gameID == data.id; } );

         if ( game ) {
            game.seen = true;
            game.seenOngoing = true;
            saveChanges();
            base.games.valueHasMutated();
         } else {
            pullGames();
         }
      } );

      function sortGames( games ) {
         return games.sort( function ( a, b ) {
            if ( b.modDate === a.modDate )
               return b.gameID - a.gameID;
            else
               return b.modDate - a.modDate;
         } );
      }

      function removeGames( ids ) {
         if ( !ids || ids.length == 0 ) return;
         var localGames = storage.games.load();

         var refreshNeeded = false;
         while ( ids.length ) {
            var id = ids.pop();
            for ( var i = 0; i < localGames.length; i++ ) {
               if ( localGames[i].gameID == id ) {
                  localGames.splice( i, 1 );
                  refreshNeeded = true;
                  break;
               }
            }
         }

         storage.games.save( localGames );

         if ( refreshNeeded ) {            
            base.games.removeAll();
            base.notifications.removeAll();
            base.games( polish( storage.games.loadCopy() ) );
         }
      }

      function publishGames( games ) {
         var localGames = storage.games.load(), hasChanges = false;

         sortGames( games );
         for ( var i = 0, game; game = games[i++]; ) {
            var exist = localGames.some( function ( localGame ) {
               return localGame.gameID == game.gameID && localGame.modDate == game.modDate && !localGame.local;
            } );
            if ( exist ) { continue; }

            var oldSeen = false;
            hasChanges = true;
            markAsChanged( game );

            var localGame = ko.utils.arrayFirst( localGames, function ( localGame ) {
               return localGame.gameID == game.gameID;
            } );

            if ( localGame ) {
               oldSeen = localGame.seen;
               updateGameInfo( localGame, game );
            } else {
               localGame = game;
               localGames.push( game );
            }

            if ( !localGame.over ) localGame.seen = oldSeen;

            app.trigger( "lobby:changed", localGame );
         }

         if ( hasChanges ) {
            sortGames( localGames );

            storage.games.save( localGames );
            storage.since.save( localGames.length ? localGames[0].modDate : 0 );

            updateObservables( localGames );
         }
      }

      function updateObservables( source ) {
         var games = base.games();
         for ( var i = source.length - 1, localGame; localGame = source[i--]; ) {
            var game = ko.utils.arrayFirst( games, function ( game ) {
               return game.gameID === localGame.gameID;
            } );

            if ( game ) {
               updateGameInfo( game, localGame );
            } else {
               games.unshift( localGame );
            }
         }
         polish( games );
         sortGames( games );
         base.games.valueHasMutated();
         base.notifications.valueHasMutated();
      }

      function saveChanges() {
         if ( !storage ) return;
         var localGames = storage.games.load(), games = base.games();

         for ( var i = 0; i < localGames.length; i++ ) {
            var g = ko.utils.arrayFirst( games, function ( g ) { return g.gameID == localGames[i].gameID; } );
            if ( g ) updateGameInfo( localGames[i], g );
         }

         storage.games.save( localGames );
      }

      function markAsChanged( game ) {
         game.changed = true;
      }

      function updateGameInfo( game, source ) {
         game.players = source.players;
         game.over = source.over;
         game.modDate = source.modDate;
         game.lastPhrase = source.lastPhrase;
         game.seen = !!source.seen;
         game.seenOngoing = !!source.seenOngoing;

         if ( source.changed ) game.changed = true;
         else delete game.changed;
      }

      var prototype = {
         getPlayer: function () {
            return this.players[0].username === _user.username ? this.players[0] : this.players[1];
         },
         getOpponent: function () {
            return this.players[0].username === _user.username ? this.players[1] : this.players[0];
         },
         getWinner: function () {
            return this.players.length == 1 ? this.players[0] :
               this.resigned ? ( this.players[0].resigned ? this.players[1] : this.players[0] ) :
               this.players[0].score > this.players[1].score ? this.players[0] : this.players[1];
         },
         getLoser: function () {
            return this.players.length == 1 ? this.players[0] :
               this.resigned ? ( this.players[0].resigned ? this.players[0] : this.players[1] ) :
               this.players[0].score < this.players[1].score ? this.players[0] : this.players[1];
         }
      };

      function polish( games ) {

         for ( var i = 0; i < games.length; i++ ) {
            var game = games[i];

            for ( var key in prototype ) {
               game[key] = prototype[key];
            }

            if ( game.playerCount > 1 && game.players.length == 1 ) {
               game.players.push( { username: 'unknown', active: !game.players[0].active, resigned: false, score: 0 } );
            }

            game.winner = prototype.getWinner.call( game );
            game.player = prototype.getPlayer.call( game );
            game.opponent = prototype.getOpponent.call( game );
            game.loser = prototype.getLoser.call( game );

            game.won = game.getWinner().username == _user.username;
            game.resigned = game.players[0].resigned || ( game.players.length > 1 && game.players[1].resigned );
            game.creator = game.creator || game.players[0].username;
            game.isPlayerCreator = game.creator == _user.username;
            game.newGame = !!game.newGame;
            game.seen = !!game.seen;
            game.seenOngoing = !!game.seenOngoing;

            if ( game.changed ) {
               if ( game.seen && game.over ) game.seen = false;
               game.seenOngoing = false;
               delete game.summary;
               delete game.notificationSummary;
               delete game.changed;
            }
         }

         return games;
      }
   }


} );
