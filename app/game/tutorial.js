﻿define( 'game/tutorial', ['durandal/app', 'dialogs/_constants', 'api/datacontext.storage'], function ( app, consts, Storage ) {
   TUT = consts.TUT;

   var APP = document.getElementById( "app" );

   function Tutorial() {

      this.storage = new Storage( function () { return "tutorial[" + app.ctx.username + "].bubble" }, .1, { "menu": null, "dynamic": null } );

      this.swapWords = function () {
         var item = $( '.palette.left .btn:first' );

         var data = TUT.SWAP_WORDS;
         data.css = "left";
         data.top = item.offset().top;
         data.left = item.offset().left + 60;
         data.fixed = true;

         return data;
      }

      this.circleWords = function () {
         var item = $( '.palette.left .btn:nth-child(2)' );

         var data = TUT.SELECT_PHRASE;
         data.css = "left";
         data.top = item.offset().top;
         data.left = item.offset().left + 60;
         data.fixed = true;

         return data;
      }

      this.archivedGames = function () {
         var item = $( '.palette.right .menu' );

         var data = TUT.ARCHIVE_GAMES;
         data.css = "right";
         data.top = item.offset().top + APP.scrollTop - 10;
         data.left = item.offset().left - 190;
         data.fixed = true;

         return data;
      }

      this.placePhrase = function () {
         var maxLeft = window.innerWidth - 300;
         var item = $( '.magnet-placeholder' ).filter( function ( i ) {
            if ( $( this ).offset().top > 200 && $( this ).offset().left < maxLeft && $( this ).offset().left > 70 ) return true;
            return false;
         } );

         var data = TUT.PLACE_PHRASE;
         data.css = "bottom left";
         data.top = item.offset().top - 170 + APP.scrollTop;
         data.left = item.offset().left;

         return data;
      }

      this.fillPath = function () {
         var maxLeft = window.innerWidth - 300;
         var item = $( '.magnet-placeholder' ).filter( function ( i ) {
            if ( $( this ).offset().top > 200 && $( this ).offset().left < maxLeft && $( this ).offset().left > 70 ) return true;
            return false;
         } );

         var data = TUT.FILL_PATH;
         data.css = "bottom left";
         data.top = item.offset().top - 110 + APP.scrollTop;
         data.left = item.offset().left;

         return data;
      }

      this.dynamicSubmit = function () {
         var maxLeft = window.innerWidth - 300;
         var item = $( '.confirm-box .button' );

         var data = {
            heading: "Done?",
            content: "Click me when <br> you are done! <br> Use 3-6 words."
         };

         if ( item.offset().top + APP.scrollTop < 150 ) {
            data.css = "left";
            data.top = item.offset().top + 15 + APP.scrollTop;
            data.left = item.offset().left + 65;
         } else {
            data.css = "bottom right";
            data.top = item.offset().top - 100 + APP.scrollTop;
            data.left = item.offset().left - 75;
         }

         item.click( function () {
            app.dialog.close( 'tutorial' );
         } );

         return data;
      }

      this.bonusFor = function ( tile, content ) {
         var maxLeft = window.innerWidth - 300;
         var item = $( '.cloud .info', tile.$el );

         var data = {
            heading: "Bonus points",
            content: content || "Use an adequate word to <br/> fulfill this bonus point."
         };
         var top = data.content.split( '<br' ).length * 60;
         data.css = "bottom left";
         data.top = item.offset().top - top + APP.scrollTop;
         data.left = item.offset().left + 20;

         return data;
      }

      this.bonus = function () {
         var maxLeft = window.innerWidth - 300;
         var item = $( '.cloud .info' ).filter( function ( i ) {
            if ( $( this ).offset().top > 220 && $( this ).offset().left < maxLeft && $( this ).offset().left > 70 ) return true;
            return false;
         } );

         var data = TUT.BONUS;
         data.css = "bottom left";
         data.top = item.offset().top - 220 + APP.scrollTop;
         data.left = item.offset().left + 20;

         return data;
      }

      var base = this;
      this.relatedWords = function () {
         var item = $( '.magnet.related:first' );
         if ( item.length == 0 ) {
            return null;
         }

         var closeMe = function () {
            app.dialog.close( 'tutorial' );
            item.unbind( 'mouseup', closeMe );
         };
         item.bind( 'mouseup', closeMe );

         //var data = TUT.RELATED;
         var data = {
            heading: "Related Word",
            content: "Use a related word in <br/> your path."
         };
         data.css = "bottom right";
         data.top = item.offset().top - 110 + APP.scrollTop;
         data.left = item.offset().left - 120;
         data.fixed = false;

         return data;
      }
   }

   Tutorial.prototype.getNext = function () {
      this.qIndex = this.qIndex || 0;

      return [this.placePhrase, this.fillPath, this.bonus, this.swapWords, this.circleWords, this.relatedWords][this.qIndex++];
   }

   Tutorial.prototype.showOne = function ( data ) {
      return app.dialog.show( "tutorial", data );
   }

   Tutorial.prototype.closeAll = function () {
      return app.dialog.close( 'tutorial' );
   }

   Tutorial.prototype.showNext = function () {
      var func = this.getNext();

      if ( !func ) {
         localStorage.setItem( "tutorial", "end" );
         return $.Deferred();
      }

      var base = this;
      var data = func();
      if ( data == null ) {
         localStorage.setItem( "tutorial", "related" );
         return null;
      }

      return app.dialog.show( "tutorial", data ).then( function ( obj ) {
         if ( obj && obj.force ) return $.Deferred();
         return base.showNext();
      } );
   }

   Tutorial.prototype.refresh = function () {
      this.qIndex--;
      var func = this.getNext();

      app.trigger( "dialog:data:changed", func() );
   }

   Tutorial.prototype.show = function () {
      var base = this;
      this.qIndex = 0;

      var tutorial = localStorage.getItem( "tutorial" );

      if ( !tutorial ) {
         this.showNext();
      }

      switch ( tutorial ) {
         case "related":
            this.qIndex = 5;
            this.showNext();
            break;
      }

      var base = this;
      var res = app.on( "app:resized:delayed" ).then( function () {
         var tutorial = localStorage.getItem( "tutorial" );
         if ( !tutorial ) {
            base.refresh();
         } else {
            res.off();
         }
      } );
   }

   Tutorial.prototype.testRelated = function () {
      var tutorial = localStorage.getItem( "tutorial" );

      if ( tutorial == "related" ) {
         this.qIndex = 5;
         this.showNext();
      }
   };

   var t = new Tutorial();

   app.on( "game:score:done" ).then( function () {

      if ( app.ctx._gameOver() && !app.ctx.players()[0].resigned() &&
         ( app.ctx.players().length == 1 || !app.ctx.players()[1].resigned() ) ) {
         if ( !t.storage.menu.load() ) {
            t.storage.menu.save( true );
            setTimeout( function () {
               t.showOne( t.archivedGames() );
            }, 2000 );
         }
      }
   } );

   app.on( "game:bubble" ).then( function ( eventName, data1, data2 ) {
      ctx = app.ctx;
      var storageName = app.ctx.username + ".bubble.dynamicPath";
      if ( !t.storage.dynamic.load() ) {
         t.storage.dynamic.save( true )
         t.showOne( t[eventName].call( t, data1, data2 ) );
      }
   } );

   return t;
} );