define( ['durandal/app', 'durandal/system', 'api/datacontext', 'dialogs/_constants', './tutorial'], function ( app, system, ctx, DIALOGS, tutorial ) {
   var canSwap = ctx.tickets.swapWords;
   var canAddWords = ctx.tickets.addWords;
   var canVersions = ctx.tickets.versions;
   var allowCircle = ctx.allowCircle;

   ctx.loading.subscribe( function ( loading ) {
      if ( loading === true ) {
         app.loading( false );
      } else if ( loading === false ) {
         app.palette.show();
         app.palette.get( "quit" ).visible( !ctx.tutorialMode() );
      }
   } );

   var lastActiveWords = null;
   ctx.activeWords.subscribe( function ( words ) {
      if ( words ) {
         for ( var i = 0; i < words.length; i++ ) {
            words[i].isSelected( true );
         }
      } else {
         words = lastActiveWords;
         for ( var i = 0; i < words.length; i++ ) {
            words[i].isSelected( false );
         }
         words = null;
      }
      lastActiveWords = words;
   } );


   $( document ).keydown( function ( e ) {
      if ( location.hash.match( /game/gi ) ) {
         if ( e.keyCode == 84 ) {
            //t
            //localStorage.removeItem("tutorial");
            //tutorial.show();
         } else if ( e.keyCode == 83 ) {
            //s
            //showScroll();
         } else if ( e.keyCode == 85 ) {
            //u  
            //if (ctx.player.scored)
            //   showStars(ctx.player, ctx.lastPath);
            //else {
            //   var p = ko.utils.arrayFirst(ctx.paths(), function (p) { return p.phrase.complete() });
            //   if (p) showStars(ctx.player, p);
            //}
         } else if ( e.keyCode == 86 ) {
            //v
            //app.trigger("game:rule:toggle");
         } else if ( e.keyCode == 87 ) {
            //w
            //showGlowing(ctx.tiles()[0]);
            //showGlowing(ctx.tiles()[1]);
         }
      }
   } );

   function showStars( player, path, scoreObj, highlight, showScore ) {
      var playerEl, boxes;
      $( '.player' ).each( function ( i, el ) {
         if ( ko.dataFor( el ) == player ) {
            playerEl = $( el );
            return;
         }
      } );

      boxes = ko.utils.arrayMap( path.guiBoxes, function ( box ) { return box; } );

      var x = playerEl.offset().left + 20, y = playerEl.offset().top;

      for ( var j = 0; j < boxes.length; j++ ) {
         var box = $( boxes[j]._guiElem );
         var boxLemma = boxes[j].wordModel.lemma;
         var boxScore = ko.utils.arrayFirst( scoreObj.words, function ( w ) { return w.lemma == boxLemma; } ).points;

         if ( boxScore ) {
            $( '.magnet', box ).addClass( "highlight" );
            setTimeout( function ( b ) { $( '.magnet', b ).removeClass( "highlight" ); }, 1200, box )

            var scoreDiv = $( '<div/>', { 'class': 'score', text: '+' + boxScore } );
            box.prepend( scoreDiv );

            if ( !highlight || showScore ) {
               setTimeout( function ( div ) {
                  div.bind( $.support.transitionEnd, function ( e ) {
                     if ( e.originalEvent.propertyName == 'opacity' ) {
                        $(this).remove();
                     }
                  } ).css( { y: '-3em', opacity: 0, scale: 2 } );
               }, 0, scoreDiv );
            }
         }

         for ( var i = 0; i < boxScore * 3; i++ ) {
            var star = $( '<div/>', { 'class': 'star' } );
            var scale = ( ( Math.random() * 5 ) + 3 ) / 10;
            var offset = box.offset();

            star.css( {
               scale: scale,
               x: offset.left * ( 1 / scale ),
               y: offset.top * ( 1 / scale )
               //backgroundColor: '#' + Math.floor(Math.random() * 16777215).toString(16)
            } );

            setTimeout( function ( o ) {
               $( '#app' ).append( o[0] );

               setTimeout( function ( o ) {
                  var mul = Math.random() * 1.3 + .4;

                  o[0].bind( $.support.transitionEnd, function () {
                     $( this ).remove();
                  } ).css( {
                     x: x * ( mul / o[1] ),
                     y: y * ( mul / o[1] ),
                     scale: o[1] / mul,
                     opacity: 0
                  } );

               }, 0, o );
            }, Math.random() * 700, [star, scale] );
         }
      }
   }

   var glowingC = 0;
   function showGlowing( tile ) {

      var cloud, rule, num;
      $( '.rule' ).each( function ( i, el ) {
         if ( ko.dataFor( el ) == tile ) {
            cloud = $( el );
            rule = cloud.parent();
            num = 2 * ( tile.bonus || ( ctx.player.scored || ctx.player.score() ) * tile.mult || 20 );
            return;
         }
      } );


      if ( glowingC++ % 2 == 0 ) {
         cloud
            .transition( { scale: 1.2 }, { easing: 'ease-in-out' } )
            .transition( { scale: .9 }, { easing: 'ease-in-out' } )
            .transition( { scale: 1 }, { easing: 'ease-in-out' } );
      } else {
         cloud
            .transition( { rotate: '+=15' }, { easing: 'ease-in-out' } )
            .transition( { rotate: '-=30' }, { easing: 'ease-in-out' } )
            .transition( { rotate: '+=15' }, { easing: 'ease-in-out' } );
      }

      for ( var i = 0; i < num; i++ ) {
         var star = $( '<div/>', { 'class': 'star' } );
         var scale = ( ( Math.random() * 5 ) + 3 ) / 10;
         var position = cloud.position();
         var offset = cloud.offset();

         star.css( {
            scale: scale,
            left: 60,
            top: -20
         } );

         var distance = 200;
         setTimeout( function ( o ) {
            rule.append( o[0] );
            setTimeout( function ( o ) {
               var
                  mul = Math.random() * 1.3 + .4,
                  deg = Math.random() * 360,
                  x = distance * Math.cos( deg * Math.PI / 180 ),
                  y = distance * Math.sin( deg * Math.PI / 180 );

               o[0].bind( $.support.transitionEnd, function () {
                  $( this ).remove();
               } ).css( {
                  x: x * ( mul / o[1] ),
                  y: y * ( mul / o[1] ),
                  scale: o[1] / mul,
                  opacity: 0
               } );

            }, 0, o );
         }, Math.random() * 700, [star, scale] );
      }
   }

   function showScroll() {
      if ( ctx.gameOver() || ctx.resumedGame ) {
         app.trigger( "game:started:ready" );
         return;
      }

      document.getElementById( 'app' ).classList.add( 'noScroll' );
      setTimeout( function () {
         app.scrollDown( window.innerHeight, true );
         setTimeout( app.scrollUp, 800, true );
         setTimeout( function () {
            document.getElementById( 'app' ).classList.remove( 'noScroll' );
            app.trigger( "game:started:ready" );
         }, 1500 );
      }, 800 );
   }

   app.on( "game:updated" ).then( function ( json ) {
      if ( ctx.player.scored ) {

         var d1 = 2000, d2 = 500;
         if ( json.path.score.startTile.satisfied ) {
            ko.utils.arrayForEach( json.path.score.startTile.words, function ( i ) {
               var lemma = json.path.score.words[i].lemma;
               for ( var i = 0; i < ctx.lastPath.guiBoxes.length; i++ ) {
                  var lemma2 = ctx.lastPath.guiBoxes[i].wordModel.lemma;
                  if ( lemma2 == lemma ) {
                     var $el = $( '.magnet', ctx.lastPath.guiBoxes[i]._guiElem );
                     $el.addClass( 'highlight' );
                     setTimeout( function ( el ) { el.removeClass( 'highlight' ); }, d1, $el );

                     //var points = ctx.lastPath.startTile.bonus || (json.path.score.total / ctx.lastPath.startTile.mult);
                     //points = points / json.path.score.startTile.words.length;
                     //points = points.toFixed(0);
                     //var scoreDiv = $('<div/>', { 'class': 'score', text: '+' + points }), box = $(ctx.lastPath.guiBoxes[i]._guiElem);
                     //box.prepend(scoreDiv);

                     //setTimeout(function (div) {
                     //   div.bind($.support.transitionEnd, function (e) {
                     //      if (e.originalEvent.propertyName == 'opacity') {
                     //         div.remove();
                     //      }
                     //   }).css({ y: '-3em', opacity: 0, scale: 2 });
                     //}, 0, scoreDiv);
                  }
               }
               var points = ctx.lastPath.startTile.bonus || ( json.path.score.total / ctx.lastPath.startTile.mult );
               var scoreDiv = $( '<div/>', { 'class': 'score', text: '+' + points } ), box = $( ctx.lastPath.guiBoxes[Math.floor( ctx.lastPath.guiBoxes.length / 2 )]._guiElem );
               box.prepend( scoreDiv );

               setTimeout( function ( div ) {
                  div.bind( $.support.transitionEnd, function ( e ) {
                     if ( e.originalEvent.propertyName == 'opacity' ) {
                        $(this).remove();
                     }
                  } ).css( { y: '-3em', opacity: 0, scale: 2 } );
               }, 0, scoreDiv );
            } );
            showGlowing( ctx.lastPath.startTile );
         }

         setTimeout( function () {
            if ( json.path.score.endTile.satisfied ) {
               ko.utils.arrayForEach( json.path.score.endTile.words, function ( i ) {
                  var lemma = json.path.score.words[i].lemma;
                  for ( var i = 0; i < ctx.lastPath.guiBoxes.length; i++ ) {
                     var lemma2 = ctx.lastPath.guiBoxes[i].wordModel.lemma;
                     if ( lemma2 == lemma ) {
                        var $el = $( '.magnet', ctx.lastPath.guiBoxes[i]._guiElem );
                        $el.addClass( 'highlight' );
                        setTimeout( function ( el ) { el.removeClass( 'highlight' ); }, d1, $el );

                        //var points = ctx.lastPath.endTile.bonus || (json.path.score.total / ctx.lastPath.endTile.mult);
                        //points = points / json.path.score.endTile.words.length;
                        //points = points.toFixed(0);
                        //var scoreDiv = $('<div/>', { 'class': 'score', text: '+' + points }), box = $(ctx.lastPath.guiBoxes[i]._guiElem);
                        //box.prepend(scoreDiv);

                        //setTimeout(function (div) {
                        //   div.bind($.support.transitionEnd, function (e) {
                        //      if (e.originalEvent.propertyName == 'opacity') {
                        //         div.remove();
                        //      }
                        //   }).css({ y: '-3em', opacity: 0, scale: 2 });
                        //}, 0, scoreDiv);
                     }
                  }

                  var points = ctx.lastPath.endTile.bonus || ( json.path.score.total / ctx.lastPath.endTile.mult );
                  var scoreDiv = $( '<div/>', { 'class': 'score', text: '+' + points } ), box = $( ctx.lastPath.guiBoxes[Math.floor( ctx.lastPath.guiBoxes.length / 2 )]._guiElem );
                  box.prepend( scoreDiv );

                  setTimeout( function ( div ) {
                     div.bind( $.support.transitionEnd, function ( e ) {
                        if ( e.originalEvent.propertyName == 'opacity' ) {
                           div.remove();
                        }
                     } ).css( { y: '-3em', opacity: 0, scale: 2 } );
                  }, 0, scoreDiv );
               } );
               showGlowing( ctx.lastPath.endTile );
            }
         }, json.path.score.startTile.satisfied * ( d1 + d2 ) );

         setTimeout( function () {
            var anyRelated = false, index = 0;
            var related = ko.utils.arrayMap( json.path.score.words, function ( w ) {
               var p = 0;
               if ( w.related ) {
                  anyRelated = true;
                  p = 15;
                  json.path.score.words[index].points -= 15;
               }
               index++;
               return {
                  lemma: w.lemma,
                  points: p,
                  related: w.related
               }
            } );
            var all = json.path.score.words;

            if ( anyRelated ) {
               json.path.score.words = related;
               showStars( ctx.player, ctx.lastPath, json.path.score, 1, 1 );

               json.path.score.words = all;
               setTimeout( function () {
                  showStars( ctx.player, ctx.lastPath, json.path.score );
               }, 2000 );
            } else {
               showStars( ctx.player, ctx.lastPath, json.path.score );
            }
            setTimeout( function () {
               app.trigger( "game:stars:done" );
            }, 2000 + anyRelated * 2000 );
         }, json.path.score.startTile.satisfied * ( d1 + d2 ) + json.path.score.endTile.satisfied * ( d1 + d2 ) );
      }
   } );

   app.on( "game:started" ).then( function () {
      setTimeout( function () {
         if ( ( !ctx.tutorialMode() || ctx.gameID == 0 ) && !app.fromSignUp ) showScroll();
      }, 800 );
   } );

   app.on( "game:started:ready" ).then( function () {
      setTimeout( function () {
         //tutorial.show();
      }, 500 );
   } );

   var isMenuActive = ko.computed( function () {
      return !ctx.gameOver();
   } );

   var isPlayerActive = ko.computed( function () {
      return ctx.player.active();
   } );

   var game = {
      loadingStatus: ctx.loadingStatus,
      loading: ctx.loading,
      player: ctx.player,

      allowSwap: ko.computed( function () {
         return isMenuActive() && isPlayerActive() && canSwap() && ( ctx.mode() === '' || ctx.mode() === 'swapWords' );
      } ),
      allowResign: ko.computed( function () {
         return isMenuActive();
      } ),
      allowCircle: ko.computed( function () {
         return isMenuActive() && isPlayerActive() && allowCircle() && ( ctx.mode() === '' || ctx.mode() == 'circleWords' );
      } ),
      allowVersions: ko.computed( function () {
         return isMenuActive() && isPlayerActive() && canVersions() && ( ctx.mode() === '' || ctx.mode() == 'versions' );
      } ),
      allowAddWords: ko.computed( function () {
         return isMenuActive() && isPlayerActive() && canAddWords() && ( ctx.mode() === '' || ctx.mode() == 'addWords' );
      } ),

      mode: ctx.mode,

      swapWords: function () {
         if ( ctx.mode() == 'swapWords' ) {
            cancel();
            if ( game._wordsSub ) {
               game._wordsSub.dispose();
               game._wordsSub = null;
            }
         }
         else if ( game.allowSwap() ) {
            app.dialog.show( "slipper", DIALOGS.SWAP_WORDS );
            ctx.mode( 'swapWords' );
            app.scrollDown();
            var created = false, base = game;
            base._wordsSub = ctx.selectedWords.subscribe( function ( selectedWords ) {
               if ( ctx.mode() != 'swapWords' ) {
                  game._wordsSub.dispose();
               }
               if ( selectedWords.length > 0 && !created ) {
                  created = true;
                  app.dialog.show( "confirm", {
                     content: '',
                     doneText: 'Swap Words',
                     cancelText: 'Cancel'
                  } ).then( function ( res ) {


                     if ( res == "cancel" ) {
                        base._wordsSub.dispose();
                        cancel();
                     } else if ( res == "done" ) {
                        base._wordsSub.dispose();
                        app.dialog.close( "slipper" );
                        ctx.loadingStatus( "Swapping words" );
                        app.loading( true );

                        var data = {
                           username: ctx.player.username,
                           gameID: ctx.gameID,
                           words: ko.utils.arrayMap( ctx.selectedWords(), function ( w ) { return w.id } )
                        };
                        if ( ctx.tutorialMode() ) {
                           app.trigger( "game:swap-words", {
                              success: true,
                              oldWords: data.words,
                              words: ko.utils.arrayMap( ctx.selectedWords(), function ( w ) {
                                 var wCopy = $.extend( true, {}, w );
                                 wCopy.lemma = wCopy.altLemma;
                                 return wCopy;
                              } )
                           } );
                           canSwap( false );
                           ctx.mode( '' );
                           app.loading( false );
                        } else {
                           app.trigger( "server:game:swap-words", data, function ( res ) {
                              if ( !res.success ) {
                                 cancel();
                              } else {
                                 canSwap( false );
                              }
                              ctx.mode( '' );
                              app.loading( false );
                           } );
                        }
                     }
                  } );
               } else if ( selectedWords.length <= 0 && created ) {
                  created = false;
                  app.dialog.close( "confirm" );
               }
            } );
         }
         else {
            //app.dialog.show("alert", { content: "You can only swap words once in each turn", delay: 3000 });
         }

         function cancel() {
            app.dialog.close( "confirm" );
            app.dialog.close( "slipper" );
            ctx.mode( '' );

            var selectedWords = ctx.selectedWords();
            for ( var i = 0; i < selectedWords.length; i++ ) {
               selectedWords[i].isSelected( false );
            }

            paper.tool.remove();
         }
      },

      resign: function () {
         if ( ctx.gameOver() ) {
            return;
         }

         var content = ctx.playerCount == 1 ? "Are you sure you want to delete this game?" : "Are you sure you want to resign?";
         app.dialog.show( "confirm", {
            content: content,
            modal: true,
            doneText: ctx.playerCount == 1 ? 'Delete' : 'Resign',
            cancelText: ctx.playerCount == 1 ? 'Cancel' : 'Cancel'
         } ).then( function ( res ) {
            if ( res != "cancel" ) {
               app.trigger( "server:game:resign", {
                  username: ctx.player.username,
                  gameID: ctx.gameID,
               } );
            }
         } );
      },

      circleWords: function () {
         if ( !game.allowCircle() ) return;
         if ( ctx.activeWords() ) {
            ctx.activeWords( null );
            app.dialog.close( "slipper" );
            return;
         }

         var module = {
            load: function () {
               app.dialog.show( "slipper", DIALOGS.CIRCLE_WORDS );
               app.scrollDown();
               //$(window).resize();

               system.acquire( "game/canvas/circleWords" ).then( function ( m ) {
                  m.load().then( function ( words ) {
                     var dfd = app.scrollUp();
                     if ( dfd ) {
                        dfd.then( function () {
                           app.trigger( "app:force-resize" );
                        } )
                     }
                     ctx.activeWords( words );
                     module.unload();

                     app.dialog.show( "slipper", DIALOGS.CHOOSE_PATH );
                  } );
               } );
               ctx.activeWords( null );
            },

            unload: function () {
               app.dialog.close( "slipper" );
               ctx.mode( '' );
               paper.tool.remove();
            }
         };

         if ( ctx.mode() == 'circleWords' ) {
            module.unload();
         } else {
            ctx.mode( 'circleWords' );
            module.load();
         }
      },

      versions: function () {
         if ( ctx.mode() == 'versions' ) {
            ctx.mode( "" )
            app.dialog.close( "notice" );
         }
         else if ( game.allowVersions() ) {
            ctx.mode( "versions" );

            app.scrollUp();

            system.acquire( "dialogs/pages/versions" ).then( function ( module ) {
               var model = new module();
               model.ticket = canVersions;
               app.dialog.show( "notice", {
                  model: model, view: 'dialogs/pages/versions',
                  closeOnClick: false
               } ).then( function () {
                  ctx.mode( "" );
               } );
            } );
         }
      },

      addWords: function () {
         if ( ctx.mode() == 'addWords' ) {
            ctx.mode( "" )
            app.dialog.close( "notice" );
         }
         else if ( game.allowAddWords() ) {
            ctx.mode( "addWords" );

            system.acquire( "dialogs/pages/addWords" ).then( function ( module ) {
               var model = new module();
               model.ticket = canAddWords;
               app.dialog.show( "notice", {
                  model: model, view: 'dialogs/pages/addWords',
                  closeOnClick: false,
                  css: 'top',
                  fixed: true
               } ).then( function () {
                  ctx.mode( "" );
               } );
            } );
         }
      }
   };

   return system.extend( game, {
      noTransite: true,
      activate: function ( id ) {
         app.loading( true );

         app.trigger( "game:dispose" );
         app.palette.dispose();
         app.dialog.closeAll();

         if ( app.fromSignUp ) {
            setTimeout( function () {
               app.dialog.show( "notice", { view: "dialogs/pages/welcome", modal: true } ).then( function () {
                  delete app.fromSignUp;
                  showScroll();
               } );
            }, 200 );
         }

         app.palette.hide( { duration: 0 } );
         app.palette.add( "quit", "command", "right" )
            .click( game.resign )
            .css( {
               disabled: ko.computed( function () { return !game.allowResign() } )
            } ).visible( !ctx.tutorialMode() );

         app.palette.add( "swapWords", "action", "left" )
            .click( game.swapWords )
            .css( {
               cancel: ko.computed( function () { return game.mode() === 'swapWords' } ),
               disabled: ko.computed( function () { return !game.allowSwap() } )
            } );

         app.palette.add( "circleWords", "action", "left" )
            .click( game.circleWords )
            .css( {
               cancel: ko.computed( function () { return game.mode() === 'circleWords' || ctx.activeWords() } ),
               disabled: ko.computed( function () { return !game.allowCircle() } )
            } );

         app.palette.add( "addWords", "action", "left" )
            .click( game.addWords )
            .css( {
               cancel: ko.computed( function () { return game.mode() === 'addWords' } ),
               disabled: ko.computed( function () { return !game.allowAddWords() } )
            } );

         app.palette.add( "versions", "action", "left" )
            .click( game.versions )
            .css( {
               cancel: ko.computed( function () { return game.mode() === 'versions' } ),
               disabled: ko.computed( function () { return !game.allowVersions() } )
            } );

         ctx.unload();
         ctx.load( id );
      },

      binding: function () {
         app.scrollUp( { noAnimate: true } );
         return { cacheViews: false };
      },

      compositionComplete: function ( view ) {

      },

      detached: function () {
         ctx.unload();

         app.dialog.closeAll();

         var paths = ctx.paths();
         for ( var i = 0; i < paths.length; i++ ) {
            paths[i].dispose();
         }
         ctx.paths.removeAll();
         ctx.tiles.removeAll();
         ctx.words.removeAll();

         app.palette.dispose();
      }
   } );

} );