define( 'api/datacontext.lobby', ['durandal/app'], function ( app ) {

   function Lobby() {
      var base = this, _user;

      this.games = ko.observableArray();
      this.loading = ko.observable( false );

      var unseenUpdate = ko.observable( 0 );
      this.unseens = ko.computed( function () {
         unseenUpdate();
         var c = ko.utils.arrayFilter( base.games(), function ( g ) { return !g.seen && g.playerCount == 2 && !g.isPlayerCreator; } ).length;
         return c + ko.utils.arrayFilter( base.games(), function ( g ) { return !g.seen && g.playerCount == 2 && g.over; } ).length;
      } );

      this.seenAll = function () {
         ko.utils.arrayForEach( base.games(), function ( game ) { return game.seen = true; } );
         base.saveChanges();
         unseenUpdate( unseenUpdate() + 1 );
      }

      this.saveChanges = function () {
         var localGames = load(), games = this.games();

         for ( var i = 0; i < localGames.length; i++ ) {
            localGames[i].seen = !!games[i].seen;
            localGames[i].seenOngoing = !!games[i].seenOngoing;
            localGames[i].players = games[i].players;
            localGames[i].over = games[i].over;
         }

         save( localGames );
      }

      function pullGames() {
         var localGames = load(), since = 0;

         if ( localGames.length ) {
            since = localGames[0].modDate;
            if ( !base.games().length ) {
               //if list is empty, fill it with local stored games while waiting
               base.games( polish( localGames ) );
            }
         }

         base.loading( true );
         app.trigger( "server:lobby", { username: _user.username, modDate: since }, function ( data ) {
            if ( data.success ) {
               publish( data.games );
            }
            base.loading( false );
         } );
      }

      app.on( "user:authenticated", function ( user ) {
         base.games.removeAll();

         if ( _user = user, _user.online ) {
            pullGames();
         }
      } );

      app.on( "lobby:update" ).then( function () {
         pullGames();
      } );

      app.on( "game:update" ).then( function ( json ) {
         var g = ko.utils.arrayFirst( base.games(), function ( game ) { return game.gameID == json.gameID; } );
         debugger;
         //updateGame( g, json );
         g.over = json.over;
         g.players = json.players;
         g.modDate = json.modDate;
         g.lastPhrase = json.lastPhrase;
         g.seen = false;
         g.seenOngoing = false;
         delete g.summary;

         polish( [g] );

         ko.utils.arrayForEach( base.games(), function ( game ) { delete game.summary; } );

         base.games.valueHasMutated();
      } );

      app.on( "game:started" ).then( function ( data ) {
         var game = ko.utils.arrayFirst( base.games(), function ( game ) { return game.gameID == data.id; } );

         if ( game ) {
            game.seen = true;
            game.seenOngoing = true;
            base.saveChanges();
         }

         base.games.valueHasMutated();
      } );

      function sort( games ) {
         games.sort( function ( a, b ) { return b.modDate - a.modDate; } );
      }

      var storageKey = function () { return "lobby[" + _user.username + "].games"; };

      function load() {
         var strGames = localStorage.getItem( storageKey() );

         return strGames ? JSON.parse( strGames ) || [] : [];
      }

      function save( games ) {
         localStorage.setItem( storageKey(), JSON.stringify( games ) );
      }

      function publish( games ) {
         var localGames = load();

         sort( games );
         for ( var i = 0, game = games[i]; games[i]; i++ ) {
            var exist = ko.utils.arrayFirst( localGames, function ( localGame ) {
               return localGame.gameID === game.gameID && localGame.modDate === game.modDate;
            } );
            if ( exist ) break;

            var localGame = ko.utils.arrayFirst( localGames, function ( localGame ) {
               return localGame.gameID === game.gameID;
            } );
            if ( localGame ) {
               updateGame( localGame, game )
            } else {
               localGames.push( game );
            }
         }
         sort( localGames );

         localGames = localGames.slice( 0, 20 );

         save( localGames );

         base.games( polish( localGames ) );
      }

      function updateGame( localGame, game ) {
         localGame.players = game.playes;
         localGame.over = game.over;
         localGame.modDate = game.modDate;
         localGame.lastPhrase = game.lastPhrase;
         localGame.seen = false;
         localGame.seenOngoing = false;
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
         }

         return games;
      }
   }

   return new Lobby();
} );