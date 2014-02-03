﻿define(['durandal/app', 'api/datacontext', 'dialogs/_constants'], function (app, ctx, consts) {
   TUT = consts.TUT;

   var APP = document.getElementById("app");

   function Tutorial() {
      this.swapWords = function () {
         var item = $('.palette.left .btn:first');

         var data = TUT.SWAP_WORDS;
         data.css = "left";
         data.top = item.offset().top + APP.scrollTop;
         data.left = item.offset().left + 60;
         data.fixed = true;

         return app.dialog.show("tutorial", data);
      }

      this.circleWords = function () {
         var item = $('.palette.left .btn:nth-child(2)');

         var data = TUT.SELECT_PHRASE;
         data.css = "left";
         data.top = item.offset().top + APP.scrollTop;
         data.left = item.offset().left + 60;
         data.fixed = true;

         return app.dialog.show("tutorial", data);
      }

      window.aa = this.archivedGames = function () {
         var item = $('.palette.right .menu');

         var data = TUT.ARCHIVE_GAMES;
         data.css = "right";
         data.top = item.offset().top + APP.scrollTop- 10;
         data.left = item.offset().left - 150;
         data.fixed = true;

         return app.dialog.show("tutorial", data);
      }

      this.placePhrase = function () {
         var item = $('.magnet-placeholder').filter(function (i) {
            if ($(this).offset().top > 200) return true;
            return false;
         });

         var data = TUT.PLACE_PHRASE;
         data.css = "bottom left";
         data.top = item.offset().top - 150 + APP.scrollTop;
         data.left = item.offset().left;

         return app.dialog.show("tutorial", data);
      }

      this.fillPath = function () {
         var item = $('.magnet-placeholder').filter(function (i) {
            if ($(this).offset().top > 200) return true;
            return false;
         });

         var data = TUT.FILL_PATH;
         data.css = "bottom left";
         data.top = item.offset().top - 90 + APP.scrollTop;
         data.left = item.offset().left;

         return app.dialog.show("tutorial", data);
      }

      this.workspace = function () {
         var item = $('#workspace');

         var data = TUT.WORKSPACE;
         data.css = "bottom right";
         data.top = item.offset().top - 150 + APP.scrollTop;
         data.left = 200;

         return app.dialog.show("tutorial", data);
      }

      this.gameboard = function () {
         var item = $('.magnet-placeholder:first');

         var data = TUT.GAMEBOARD;
         data.css = "bottom left";
         data.top = item.offset().top - 130 + APP.scrollTop;
         data.left = item.offset().left;

         return app.dialog.show("tutorial", data);
      }

      this.bonus = function () {
         var item = $('.cloud .info').filter(function (i) {
            if ($(this).offset().top > 220) return true;
            return false;
         });

         var data = TUT.BONUS;
         data.css = "bottom left";
         data.top = item.offset().top - 220 + APP.scrollTop;
         data.left = item.offset().left + 20;

         return app.dialog.show("tutorial", data);
      }

      var base = this;
      this.relatedWords = function () {
         var item = $('.magnet.related:first');
         if (item.length == 0) {
            return $.Deferred(function (dfd) { dfd.reject(); })
         }

         var data = TUT.RELATED;
         data.css = "bottom right";
         data.top = item.offset().top - 170 + APP.scrollTop;
         data.left = item.offset().left - 120;

         return app.dialog.show("tutorial", data);
      }
   }

   Tutorial.prototype.getNext = function () {
      this.qIndex = this.qIndex || 0;

      return [this.placePhrase, this.fillPath, this.bonus, this.swapWords, this.circleWords, this.relatedWords][this.qIndex++];
   }

   Tutorial.prototype.showNext = function () {
      var func = this.getNext();

      if (!func) {
         localStorage.removeItem("tutorial");
         return $.Deferred();
      }

      var base = this;
      return func().then(function (obj) {
         if (obj && obj.force) return $.Deferred();      
         return base.showNext();
      }, function () {
         localStorage.setItem("tutorial", "related");
      });
   }

   Tutorial.prototype.show = function () {
      var base = this;
      this.qIndex = 0;

      if (!localStorage.getItem("tutorial")) {
         return;
      }

      if (localStorage.getItem("tutorial") == "related") {
         this.qIndex = 5;
      }
      
      this.showNext();

   }

   var t = new Tutorial();
   
   ctx.gameOver.subscribe(function (gameOver) {
      if (!ctx.resumedGame && gameOver && !ctx.player.resigned() && ctx.playerCount == 2) {
         if (!localStorage.getItem("tutorial-menu")) {
            
            t.archivedGames();
            localStorage.setItem("tutorial-menu", true);
         }
      }
   });

   return t;
});