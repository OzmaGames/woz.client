define( ['durandal/app', 'api/constants', 'api/utils', 'game/tutorial', 'paper'], function ( app, constants, utils, bubble ) {

   function Path( model, id, nWords, startTile, endTile, cw, phrase ) {
      var base = this;

      base.id = id;
      base.nWords = nWords;
      base.startTile = utils.find( model.tiles(), { id: startTile } );
      base.endTile = utils.find( model.tiles(), { id: endTile } );
      base.cw = ( cw === undefined ? true : cw );

      base.phrase = {
         _complete: ko.observable( false ),
         playerId: 0,
         score: 0,
         words: ko.observableArray()
      };

      base.phrase.toString = function () {
         var str = "", len = base.phrase.words().length;
         for ( var i = 0; i < len; i++ ) {
            str += i + ( i == len - 1 ? '' : ' ' );
         }
         for ( var i = 0; i < len; i++ ) {
            str = str.replace( base.phrase.words()[i].index, base.phrase.words()[i].word.lemma )
         }
         return str;
      }

      base.phrase.update = function ( words ) {
         base.completeSub.dispose();
         if ( base.phrase.complete.immediate() ) return;
         ko.utils.arrayForEach( words || [], function ( word ) {
            base.addWord( word, undefined, true );
         } );
         if ( base.nWords == 0 && words && words.length >= 3 ) {
            base.phrase._complete( true );
         }
      }

      var isComplete = function () {
         return this.phrase._complete() === true || this.phrase.words().length == 6 || ( this.nWords != 0 && this.phrase.words().length == this.nWords );
      }

      base.phrase.complete = ko.computed( isComplete, base ).extend( { throttle: 1 } ); //let exchange happends if any
      base.phrase.complete.immediate = function () {
         return isComplete.call( base );
      }

      base.completeSub = base.phrase.complete.subscribe( function ( complete ) {
         if ( complete ) {
            app.dialog.close( "slipper" );
            app.dialog.show( "confirm", {
               modal: true,
               content: 'Do you want to place <br/><b>"' + base.phrase.toString() + '"</b>?',
               doneText: 'YES',
               cancelText: 'NO'
            } ).then( function ( result ) {
               model.activeWords( null );
               paper.tool.remove();
               if ( result == "done" ) {
                  app.loading( true );
                  model.player.active( false );
                  base.phrase.words().sort( function ( a, b ) { return a.index - b.index } );
                  //console.log(ko.utils.arrayMap(base.phrase.words(), function (word) { return word.word.lemma; }));

                  var data = {
                     gameID: model.gameID,
                     pathID: base.id,
                     username: model.player.username,
                     words: ko.utils.arrayMap( base.phrase.words(), function ( word ) { return word.word.id; } )
                  };
                  model.lastPath = base;

                  if ( app.ctx.tutorialMode() ) {
                     data.words = ko.utils.arrayMap( base.phrase.words(), function ( word ) { return word.word.lemma; } );

                     app.trigger( "server:tutorial:place-phrase", data, function ( data ) {

                        bubble.closeAll();
                        var cancel = function ( message ) {
                           if ( typeof message == "string" ) {
                              app.dialog.show( "notice", {
                                 view: 'dialogs/pages/alert', model: {
                                    message: message
                                 }
                              } );
                           }
                           model.player.active( true );
                           app.loading( false );
                           base.removeAll();
                           return;
                        }

                        var relatedWord = ko.utils.arrayFirst( model.unplayedWords(), function ( w ) { return w.isRelated; } );
                        if ( relatedWord ) {
                           //return cancel( 'This tutorial requires you to use the related word. Please try again.' );
                           return setTimeout( function () {
                              cancel( bubble.showOne( bubble.relatedWords() ) );
                           }, 500 );
                        }

                        if ( ( base.startTile.instruction != "" && !data.score.startTile.satisfied ) ||
                           ( base.endTile.instruction != "" && !data.score.endTile.satisfied ) ) {
                           var tile = ( base.startTile.instruction != "" && !data.score.startTile.satisfied ) ? base.startTile : base.endTile;

                           return setTimeout( function () {
                              cancel( bubble.showOne( bubble.bonusFor( tile ) ) );
                           }, 500 );
                        }
                        
                        if ( model.gameID == 5 && ( model.tickets.versions() && model.tickets.addWords() && model.tickets.swapWords() ) ) {
                           return cancel( 'Please use at least one of the action items from the left menu to complete this tutorial.' );
                        }

                        ctx.player.scored = data.score.total;
                        ctx.player.score( ctx.player.score() + data.score.total );
                        ctx.player.active( true );
                        ko.utils.arrayForEach( data.score.words, function ( sw ) {
                           sw.id = ko.utils.arrayFirst( ctx.words(), function ( word ) {
                              return sw.lemma == word.lemma;
                           } ).id;
                        } );
                        if ( null == ko.utils.arrayFirst( ctx.paths(), function ( path ) {
                              return !path.phrase.complete.immediate();
                        } ) ) {
                           ctx._gameOver( true );

                           var sub;
                           sub = app.on( "game:stars:done" ).then( function () {
                              app.trigger( "game:tiles:visible", false );

                              if ( ctx.tutorialObject().id >= ctx.tutorialObject().total - 1 ) {
                                 app.trigger( "server:tutorial:skip", { username: model.username } );
                                 app.dialog.show( "notice", { view: 'dialogs/pages/TutorialEnd' } ).then( function () {
                                    app.navigate( 'newGame' );
                                 } );
                              } else {
                                 app.dialog.show( "notice", { view: 'dialogs/pages/TutorialNext' } ).then( function () {
                                    app.navigate( 'nextTutorial' );
                                 } );
                              }

                              sub.off();
                           } );
                        }
                        //ctx.lastPath = ctx.paths()[0];
                        app.trigger( "game:updated", { path: { score: data.score } } );
                        app.loading( false );
                     } );
                  } else {
                     base.completeSub.dispose();
                     app.trigger( "server:game:place-phrase", data );
                  }
                  app.scrollUp();
               } else {
                  base.phrase._complete( false );
                  base.removeAll();
               }
            } );
         }
         ko.utils.arrayForEach( base.phrase.words(), function ( word ) {
            word.word.isPlayed = ( complete ? 2 : 1 );
         } );
      } );

      base.hasWordAt = function ( index ) {
         var entity = base._getEntityAt( index );
         return entity != null ? true : false;
      }

      base.getWordAt = function ( index ) {
         var entity = base._getEntityAt( index );
         return entity != null ? entity.word : null;
      }

      base._getEntityAt = function ( index ) {
         return ko.utils.arrayFirst( base.phrase.words(), function ( entity ) {
            return entity.index == index;
         } );
      }

      base._lastEmptyIndex = function () {
         for ( var i = 0; i < 10; i++ ) {
            if ( null == ko.utils.arrayFirst( base.phrase.words(), function ( entity ) { return entity.index === i; } ) ) {
               return i;
            }
         }
      }

      base.addWords = function ( words ) {
         base.removeAll();
         for ( var i = 0; i < words.length; i++ ) {
            if ( !base.addWord( words[i] ) ) return false;
         }
         base.phrase._complete( true );
         base.phrase.words.valueHasMutated();
         return true;
      }

      base.addWord = function ( word, index, force ) {
         if ( !model.player.active() && force !== true ) {
            return false;
         }

         if ( index === undefined ) {
            index = base._lastEmptyIndex();
         }

         if ( ( base.nWords == 0 && index >= 6 ) || ( base.nWords != 0 && index >= base.nWords ) ) return false;

         if ( base.hasWordAt( index ) ) {
            base.removeWordAt( index );
            console.log( '%cWhen?', 'background: red; color: white' );
         }

         if ( word.isPlayed ) {
            if ( base.nWords == 0 && word.lastBox.pathModel == base )
               return false;
            //relocation
         }

         word.isPlayed = 1;
         model.words.valueHasMutated();

         base.phrase.words.push( { word: word, index: index } );

         return true;
      }

      base.removeAll = function () {
         var words = base.phrase.words();

         for ( var i = 0; i < words.length; i++ ) {
            words[i].word.isPlayed = 0;
            delete words[i].word.lastBox;
         }
         base.phrase.words.removeAll();

         model.words.valueHasMutated();
      }

      base._removeEntity = function ( entity, opt ) {
         if ( entity == null ) return false;

         opt = opt || {};

         if ( !opt.keepUnplayed ) {
            entity.word.isPlayed = 0;
         }

         if ( base.nWords == 0 ) {
            var pos = base.phrase.words().indexOf( entity );
            base.phrase.words().splice( pos, 1 );
         } else {
            delete entity.word.lastBox;
            base.phrase.words.remove( entity );
         }

         model.words.valueHasMutated();

         return true;
      }

      base.removeWordAt = function ( index, opt ) {
         var entity = base._getEntityAt( index );
         if ( base._removeEntity( entity, opt ) ) {
            if ( base.nWords == 0 ) {
               entity.word.lastBox.index = base.phrase.words().length;
               delete entity.word.lastBox;
               for ( var i = entity.index + 1; i < 10; i++ ) {
                  if ( ( entity = base._getEntityAt( i ) ) == null ) break;
                  entity.index--;
                  if ( entity.word.lastBox ) {
                     entity.word.lastBox.index--;
                     //delete entity.word.lastBox;
                  }
               }
               base.phrase.words.valueHasMutated();
            }
         }
      }

      if ( phrase ) {
         //setTimeout(function (data) {
         base.phrase.update( phrase.words );
         //}, 100, { base: base, words: phrase.words });
      }
   }

   return Path;
} );