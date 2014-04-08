define( 'api/datacontext', ['durandal/system', 'plugins/router', 'durandal/app', 'api/constants', 'dialogs/_constants', 'api/model/Path'],
  function ( system, router, app, consts, DIALOGS, Path ) {

     var model =
     {
        games: ko.observableArray(),

        gameID: 0,

        player: { active: ko.observable() },
        players: ko.observableArray(),

        tiles: ko.observableArray(),
        paths: ko.observableArray(),
        words: ko.observableArray(),

        loading: ko.observable( null ),
        loadingStatus: ko.observable( '' ),

        activeWord: ko.observable( null ),
        activeWords: ko.observable( null ),

        playerCount: 1,

        tickets: {
           swapWords: ko.observable( 1 ),
           versions: ko.observable( 1 ),
           addWords: ko.observable( 1 ),
           reset: function ( tickets ) {
              model.tickets.swapWords( tickets.swapWords );
              model.tickets.addWords( tickets.addWords );
              model.tickets.versions( tickets.versions );
           }
        },

        allowCircle: ko.observable( true )
     };
     model.collection = {
        name: ko.observable( "woz" ),
        size: ko.observable( 30 )
     };

     model.username = sessionStorage.getItem( "username" ) || "ali";

     app.on( 'account:login', function ( res ) {
        if ( res.success ) {
           model.username = res.username;

           sessionStorage.removeItem( "lobby" );
           sessionStorage.setItem( "username", model.username );
        }
     } );

     model._gameOver = ko.observable( false );
     model.gameOver = ko.computed( function () {
        var completedPaths = ko.utils.arrayFilter( this.paths(), function ( path ) {
           return path.phrase.complete() === true;
        } );
        if ( completedPaths.length !== 0 && completedPaths.length === this.paths().length ) return true;
        return this._gameOver();
     }, model );

     model.mode = ko.observable( '' ); //swap;
     model.words.immovable = ko.computed( function () { return model.mode() === 'swapWords'; } );
     model.tutorialMode = ko.observable( false );
     model.tutorialObject = ko.observable();

     model.load = function ( id ) {
        console.log( "loading game.." );
        app.off( "game:start game:update game:swap-words" );
        model.loading( true );
        app.dialog.show( "loading" );

        if ( id === "" || id === undefined ) id = -1;

        if ( location.hash.match( /tutorial/ig ) ) {
           model.tutorialMode( true );
           if ( id.toString().toLowerCase() == "next" ) {
              id = +localStorage.getItem( "tutorial-index" ) + 1;
           } else if ( id.toString().toLowerCase() == "new" ) {
              id = +localStorage.getItem( "tutorial-index" );
              if ( id >= 5 ) id = 0;
           }
           id = isNaN( id ) ? 0 : id * 1;
        }
        else {
           model.tutorialMode( false );
           id = isNaN( id ) ? -1 : id * 1;
        }

        app.on( "game:start", function ( json ) {
           if ( model.tutorialMode() ) {
              router.navigate( 'tutorial/' + json.id, { trigger: false, replace: true } );

              json.skip = function () {
                 app.dialog.show( "confirm", {
                    modal: true,
                    content: 'Do you want to skip all tutorials?',
                    doneText: 'YES',
                    cancelText: 'NO'
                 } ).then( function ( result ) {
                    if ( result == "done" ) {
                       app.trigger( "server:tutorial:skip", { username: model.username } );
                       app.navigate( "newGame" );
                    }
                 } );
              }
              model.tutorialObject( json );
              localStorage.setItem( "tutorial-index", json.id );

           } else {
              router.navigate( 'game/' + json.id, { trigger: false, replace: true } );
           }

           model.loadingStatus( "Starting The Game..." );

           model.gameID = json.id;
           model.playerCount = json.playerCount;
           model.collection.name(( json.collection && json.collection.shortName ) ? json.collection.shortName : "woz" );
           model.collection.size(( json.collection && json.collection.size ) ? json.collection.size : 30 );

           model.resumedGame = json.resumedGame || false;

           ko.utils.arrayForEach( json.players, function ( player ) {
              if ( player.username === model.username ) {
                 model.player.active( player.active );
                 player.active = model.player.active;
              } else {
                 player.active = ko.observable( player.active );
              }
              player.resigned = ko.observable( player.resigned || false );
              player.score = ko.observable( player.score );
           } );

           model.player = find( json.players, { username: model.username } );
           model.players( json.players );

           if ( model.playerCount > 1 && !json.over ) {
              if ( model.players().length == 1 ) {
                 model.players.unshift( {
                    active: ko.observable( false ),
                    resigned: ko.observable( false ),
                    score: ko.observable( 0 ),
                    username: 'unknown'
                 } );
              }
              var dialogData;
              if ( model.player.active() )
                 dialogData = DIALOGS.YOUR_TURN_FIRST_ROUND;
              else
                 dialogData = DIALOGS.THEIR_TURN;

              var tmp = app.on( "game:started:ready" ).then( function () {
                 app.dialog.show( "slipper-fixed", dialogData );
                 tmp.off();
              } );
           }

           if ( json.allowCircle == undefined ) json.allowCircle = true;
           if ( json.tickets == undefined ) {
              json.tickets = {
                 swapWords: !json.actionDone,
                 versions: 1,
                 addWords: 1,
              }
           }
           model.tickets.reset( json.tickets );
           model.allowCircle( json.allowCircle );

           ko.utils.arrayForEach( json.words, function ( word ) {
              word.isSelected = ko.observable( false );
              word.css = "";
              if ( ko.utils.arrayFilter( json.words, function ( w ) { return word.id === w.id } ).length > 1 ) {
                 word.isPlayed = true;
              }
           } );
           model.words( json.words );

           for ( var i = 0; i < json.tiles.length; i++ ) {
              json.tiles[i].imageId = json.tiles[i].imageID;
              json.tiles[i].imageName = consts.bigImageURL( model.collection.name(), json.tiles[i].imageId );
              json.tiles[i].info = ( json.tiles[i].bonus !== 0 ? '+' + json.tiles[i].bonus : 'X' + json.tiles[i].mult );
              json.tiles[i].active = ko.observable( false );
           }
           model.tiles( json.tiles );

           //json.paths[0].nWords = 0;
           json.paths = ko.utils.arrayMap( json.paths, function ( p ) {
              return new Path( model, p.id, p.nWords, p.startTile, p.endTile, p.cw, p.phrase );
           } );
           model.paths( json.paths );

           model._gameOver( json.over );

           model.winner = function () {
              if ( model.gameOver() ) {
                 var maxScore = -1, winner = null;
                 ko.utils.arrayForEach( model.players(), function ( player ) {
                    if ( maxScore < player.score() && !player.resigned() ) {
                       winner = player;
                       maxScore = player.score();
                    }
                 } );
                 return winner;
              }
              return null;
           };

           model.loading( false );
           model.loadingStatus( "Ready" );
           app.dialog.close( "loading" );
           app.trigger( "game:started" );
        } );

        app.on( "game:update", function ( json ) {
           app.loading( false );

           if ( json.success && json.gameID == model.gameID ) {

              if ( json.allowCircle == undefined ) json.allowCircle = true;
              if ( json.tickets == undefined ) {
                 json.tickets = {
                    swapWords: json.swapWords || !json.actionDone,
                    versions: json.versions || 1,
                    addWords: json.addWords || 1,
                 }
              }
              model.tickets.reset( json.tickets );
              model.allowCircle( json.allowCircle );

              model._gameOver( json.over || false );
              if ( model.gameOver() ) {
                 app.dialog.closeAll();

                 var dfd = $.Deferred( function ( dfd ) {
                    system.acquire( "dialogs/pages/GameOver" ).then( function ( module ) {
                       var winner = model.winner(), data;
                       if ( winner === model.player ) {
                          if ( model.playerCount == 1 ) {
                             data = module.SOLO;
                          } else {
                             data = module.WON;
                          }
                       } else if ( winner === null ) {
                          app.navigate( "lobby" );
                          return;
                       } else if ( model.player.resigned() ) {
                          data = module.RESIGNED;
                       } else {
                          data = module.LOST;
                       }

                       dfd.resolve( data );
                    } )
                 } );

                 var sub;
                 sub = app.on( "game:score:done" ).then( function () {
                    dfd.then( function ( data ) {
                       app.trigger( "game:tiles:visible", false );

                       //if someone resignes, then stats is null
                       json.stats = json.stats || {
                          xp: -1,
                          levelUp: false
                       };

                       data.xp = json.stats.xp;

                       //json.stats.levelUp = true;

                       if ( json.stats.levelUp ) {
                          data.noRedirect = true; //dont redirect
                       }

                       app.dialog.show( "notice", { model: data, view: 'dialogs/pages/GameOver' } ).then( function () {
                          if ( json.stats.levelUp ) {
                             app.dialog.show( "notice", {
                                model: {
                                   message: json.stats.level,
                                   imageName: 'images/game/level/' + json.stats.level.toLowerCase() + '.png'
                                }, view: "dialogs/pages/LevelUp"
                             } ).then( function () {
                                app.navigate( data.target );
                             } );
                          }
                       } );
                       sub.off();
                    } );
                 } );

              }
           }

           var waitingForStars = false;
           for ( var i = 0; i < json.players.length; i++ ) {
              var jplayer = json.players[i];
              var cplayer = find( model.players(), { username: jplayer.username } );
              if ( !cplayer ) {
                 cplayer = find( model.players(), { username: 'unknown' } );
                 cplayer.username = jplayer.username;
                 ctx.players.valueHasMutated();
              }
              var scored = jplayer.score - cplayer.score();

              cplayer.scored = scored;
              cplayer.score( jplayer.score );
              cplayer.active( jplayer.active );
              cplayer.resigned( jplayer.resigned || false );

              if ( cplayer.username === model.player.username && scored ) {
                 waitingForStars = true;
                 ( function ( scored ) {
                    var sub;
                    sub = app.on( "game:stars:done" ).then( function () {
                       app.dialog.show( "alert", {
                          content: "You scored <b>" + scored + "</b> points!",
                          delay: 3000
                       } ).then( function () {
                          app.trigger( "game:score:done" );
                       } );

                       sub.off();
                    } );
                 } )( scored )
              }
           }

           if ( !waitingForStars && model.gameOver() ) {
              app.trigger( "game:score:done" );
           }

           if ( json.path ) {
              var path = ko.utils.arrayFirst( model.paths(), function ( path ) { return path.id == json.path.id } );
              path.phrase.update( json.path.phrase );
           }

           if ( json.words ) {
              for ( var j = 0; j < json.words.length; j++ ) {
                 json.words[j].isSelected = ko.observable( false );
                 json.words[j].css = "";
                 model.words.push( json.words[j] );
              }
           }

           if ( model.playerCount > 1 && !model.gameOver() ) {
              if ( model.player.active() )
                 app.dialog.show( "slipper-fixed", DIALOGS.YOUR_TURN );
              else
                 app.dialog.show( "slipper-fixed", DIALOGS.THEIR_TURN );
           }

           model.players.valueHasMutated();

           app.trigger( "game:updated", json );
        } );

        app.on( "game:swap-words", function ( json ) {
           if ( json.success && json.words ) {
              for ( var j = 0; j < json.oldWords.length; j++ ) {
                 var word = ko.utils.arrayFirst( model.words(), function ( w ) { return w.id === json.oldWords[j]; } );
                 model.words.remove( word );
              }
              for ( var j = 0; j < json.words.length; j++ ) {
                 json.words[j].isSelected = ko.observable( false );
                 json.words[j].css = json.words[j].css || "";
                 model.words.push( json.words[j] );
              }
           }
        } );

        model.loadingStatus( "Waiting for the server..." );

        if ( model.tutorialMode() ) {
           model.loadingStatus( "Gathering learning materials..." );
           app.trigger( "server:tutorial:start", { username: model.username, level: id } );
        } else {
           if ( id >= 0 ) {
              model.loadingStatus( "Waiting for awesomeness..." );
              app.trigger( "server:game:resume", { username: model.username, id: id } );
           } else {
              app.trigger( "server:game:queue", {
                 username: model.username,
                 playerCount: model.playerCount,
                 friendUsername: model.friendUsername,
                 collection: model.collectionName || 'woz'
              }, function () {
                 model.loadingStatus( "Waiting for awesomeness..." );
              } );
           }
        }
     };

     model.unload = function () {
        model._gameOver( false );
        app.off( "game:start game:update game:swap-words" );
        model.words.removeAll();
        var paths = ctx.paths();
        for ( var i = 0; i < paths.length; i++ ) {
           paths[i].dispose();
        }
        model.paths.removeAll();
        model.tiles.removeAll();
     }

     model.playedWords = ko.computed( function () {
        return ko.utils.arrayFilter( model.words(), function ( word ) { return ( word.isPlayed || false ); } );
     } );

     model.unplayedWords = ko.computed( function () {
        return ko.utils.arrayFilter( model.words(), function ( word ) { return !( word.isPlayed || false ); } );
     } );

     model.selectedWords = ko.computed( function () {
        return ko.utils.arrayFilter( model.words(), function ( word ) { return word.isSelected(); } );
     } );

     return window.ctx = model;

     function find( arr, data ) {
        for ( var i = 0; i < arr.length; i++ )
           if ( match( arr[i], data ) ) return arr[i];

        function match( item, data ) {
           for ( var key in data )
              if ( item[key] !== data[key] ) return false;
           return true;
        }
     }
  } );