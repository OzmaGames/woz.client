define( 'api/datacontext.lobby', ['durandal/app', './datacontext.storage'], function ( app, Storage ) {

   var version = 0.15;

   Object.beget = ( function ( Function ) {
      return function ( Object ) {
         Function.prototype = Object;
         return new Function;
      }
   } )( function () { } );


   function Lobby() {
      var base = this, _user, storage;

      this.games = ko.observableArray();
      this.notifications = ko.observableArray();

      this.loading = ko.observable( false );

      var unseenUpdate = ko.observable( 0 );
      this.unseens = ko.computed( function () {
         unseenUpdate();
         var c = ko.utils.arrayFilter( base.games(), function ( g ) { return !g.seen && g.playerCount == 2 && !g.isPlayerCreator; } ).length;
         return c + ko.utils.arrayFilter( base.games(), function ( g ) { return !g.seen && g.playerCount == 2 && g.over; } ).length;
      } );

      this.seenAll = function () {
         ko.utils.arrayForEach( base.games(), function ( game ) { game.seen = true; } );
         base.saveChanges();
         unseenUpdate( unseenUpdate() + 1 );
      }

      this.seenAllOngoing = function () {
         ko.utils.arrayForEach( base.games(), function ( game ) { game.seenOngoing = true; } );
         base.saveChanges();
      }

      this.games.subscribe( function ( games ) {
         var notifications = base.notifications(), changed = false;
         for ( var i = 0, game; game = games[i++]; ) {
            var exist = ko.utils.arrayFirst( notifications, function ( ntf ) { return ntf.gameID == game.gameID; } );
            if ( !exist ) {
               if ( game.playerCount == 2 ) {
                  notifications.push( game );

                  if ( !game.isPlayerCreator ) {
                     var copy = Object.beget( game );
                     copy.newGame = true;
                     copy.modDate = copy.creationDate;
                     notifications.push( copy );
                  }
                  
                  changed = true;
               }
            }
         }
         sort( notifications );
         base.notifications.valueHasMutated();
         //if ( changed ) {            
         //}
      } );

      function pullGames() {
         //if ( base.loading() ) return;

         var since = storage.since.load();

         if ( since && !base.games().length ) {
            //if list is empty, fill it with local stored games while waiting
            var localGames = storage.games.load();
            base.games( polish( localGames ) );
         }

         base.loading( true );
         app.trigger( "server:lobby", { username: _user.username, modDate: since }, function ( data ) {
            if ( data.success && data.games.length ) {
               publish( data.games );
            }
            base.loading( false );
         } );
      }

      function userAuthenticated(user) {
         base.games.removeAll();

         if ( _user = user, _user.online ) {
            window.stg = storage = new Storage( "lobby[" + _user.username + "]", version, { "games": [], "since": 0 } );
            pullGames();
         }
      }

      app.on( "user:authenticated" ).then( userAuthenticated );

      app.on( "account:login" ).then( function ( json ) {
         userAuthenticated( { username: json.username, online: 1 } );
      } );
      
      app.on( "lobby:update" ).then( function () {
         pullGames();
      } );

      app.on( "game:update" ).then( function ( json ) {
         var g = ko.utils.arrayFirst( base.games(), function ( game ) { return game.gameID == json.gameID; } );
         if ( g ) {
            g.over = json.over;
            g.players = json.players;
            g.modDate = +new Date(); //storage.since.load() + 1;  //todo
            g.localChanges = true;
            g.seen = false;

            if ( g.players[0].resigned || ( g.players.length > 1 && g.players[1].resigned ) ) {

            } else {
               g.lastPhrase = {
                  phrase: ko.utils.arrayMap( json.path.phrase, function ( p ) { return p.lemma } ).join( ' ' ),
                  score: json.path.score.total,
                  username: json.path.username
               };
               g.seenOngoing = ( json.path.username == _user.username );               
            }
            delete g.summary;

            var pos = base.games.indexOf( g );
            base.games().splice( pos, 1 );
            base.games().unshift( g );
            
            polish( [g] );

            base.saveChanges();

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
            base.saveChanges();
         } else {
            pullGames();
         }

         base.games.valueHasMutated();
      } );

      function sort( games ) {
         games.sort( function ( a, b ) {
            if ( b.modDate === a.modDate )
               return b.gameID - a.gameID;
            else
               return b.modDate - a.modDate;
         } );
      }

      function publish( games ) {
         var localGames = storage.games.load();
         
         sort( games );
         for ( var i = 0, game; game = games[i++]; ) {
            var exist = ko.utils.arrayFirst( localGames, function ( localGame ) {
               return localGame.gameID == game.gameID && localGame.modDate == game.modDate && !localGame.localChanges;
            } );
            if ( exist ) { debugger; break;}

            var localGame = ko.utils.arrayFirst( localGames, function ( localGame ) {
               return localGame.gameID == game.gameID;
            } );
            if ( localGame ) {
               updateGameUnseen( localGame, game );
               localGame.needPolish = true;
            } else {
               localGames.push( game );
               game.needPolish = true;
            }

            app.trigger( "game:lobby:published", game );
         }
         sort( localGames );

         //localGames = localGames.slice( 0, 20 );

         copyGamesKeepRef( localGames );

         storage.games.save( localGames );
         storage.since.save( localGames.length ? localGames[0].modDate : 0 );

         sort( base.games() );

         base.games.valueHasMutated();
         base.notifications.valueHasMutated();
      }

      function copyGamesKeepRef( localGames ) {
         var games = base.games();
         for ( var i = localGames.length - 1, localGame; localGame = localGames[i--]; ) {
            var exist = ko.utils.arrayFirst( games, function ( game ) {
               return game.gameID === localGame.gameID;
            } );

            if ( exist ) {
               updateGame( exist, localGame );
               if ( localGame.needPolish ) exist.needPolish = true;
            } else {
               games.unshift( localGame );
            }
         }
         polish( games );
      }

      this.saveChanges = function () {
         var localGames = storage.games.load(), games = this.games();

         for ( var i = 0; i < localGames.length; i++ ) {
            updateGame( localGames[i], games[i] );
         }

         storage.games.save( localGames );
         //storage.since.save( localGames.length ? localGames[0].modDate : 0 );
      }

      function updateGameUnseen( localGame, game ) {
         updateGame( localGame, game );
         localGame.seen = false;
         localGame.seenOngoing = false;
      }

      function updateGame( localGame, game ) {
         localGame.players = game.players;
         localGame.over = game.over;
         localGame.modDate = game.modDate;
         localGame.lastPhrase = game.lastPhrase;
         localGame.seen = !!game.seen;
         localGame.seenOngoing = !!game.seenOngoing;         
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

            if ( game.needPolish && game.summary ) {
               delete game.summary;
               delete game.needPolish;
            }
         }

         return games;
      }
   }

   return new Lobby();
} );