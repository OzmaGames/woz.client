define(['durandal/app', 'api/datacontext', 'dialogs/_constants'], function (app, ctx, consts) {
   TUT = consts.TUT;

   var APP = document.getElementById("app");

   function Tutorial() {
      this.swapWords = function () {
         var item = $('.palette.left .btn:first');

         var data = TUT.SWAP_WORDS;
         data.css = "left";
         data.top = item.offset().top;
         data.left = item.offset().left + 60;
         data.fixed = true;

         return  data;
      }

      this.circleWords = function () {
         var item = $('.palette.left .btn:nth-child(2)');

         var data = TUT.SELECT_PHRASE;
         data.css = "left";
         data.top = item.offset().top;
         data.left = item.offset().left + 60;
         data.fixed = true;

         return data;
      }

      this.archivedGames = function () {
         var item = $('.palette.right .menu');

         var data = TUT.ARCHIVE_GAMES;
         data.css = "right";
         data.top = item.offset().top + APP.scrollTop - 10;
         data.left = item.offset().left - 150;
         data.fixed = true;

         return  data;
      }

      this.placePhrase = function () {
         var maxLeft = window.innerWidth - 300;
         var item = $('.magnet-placeholder').filter(function (i) {
            if ($(this).offset().top > 200 && $(this).offset().left < maxLeft && $(this).offset().left > 70) return true;
            return false;
         });

         var data = TUT.PLACE_PHRASE;
         data.css = "bottom left";
         data.top = item.offset().top - 170 + APP.scrollTop;
         data.left = item.offset().left;

         return data;
      }

      this.fillPath = function () {
         var maxLeft = window.innerWidth - 300;
         var item = $('.magnet-placeholder').filter(function (i) {
            if ($(this).offset().top > 200 && $(this).offset().left < maxLeft && $(this).offset().left > 70) return true;
            return false;
         });

         var data = TUT.FILL_PATH;
         data.css = "bottom left";
         data.top = item.offset().top - 110 + APP.scrollTop;
         data.left = item.offset().left;

         return  data;
      }

      this.workspace = function () {
         var item = $('#workspace');

         var data = TUT.WORKSPACE;
         data.css = "bottom right";
         data.top = item.offset().top - 150 + APP.scrollTop;
         data.left = 200;

         return  data;
      }

      this.gameboard = function () {
         var item = $('.magnet-placeholder:first');

         var data = TUT.GAMEBOARD;
         data.css = "bottom left";
         data.top = item.offset().top - 130 + APP.scrollTop;
         data.left = item.offset().left;

         return  data;
      }

      this.bonus = function () {
         var maxLeft = window.innerWidth - 300;
         var item = $('.cloud .info').filter(function (i) {
            if ($(this).offset().top > 220 && $(this).offset().left < maxLeft && $(this).offset().left > 70) return true;
            return false;
         });

         var data = TUT.BONUS;
         data.css = "bottom left";
         data.top = item.offset().top - 220 + APP.scrollTop;
         data.left = item.offset().left + 20;

         return  data;
      }

      var base = this;
      this.relatedWords = function () {
         var item = $('.magnet.related:first');
         if (item.length == 0) {
            return null;
            return $.Deferred(function (dfd) { dfd.reject(); })
         }

         var data = TUT.RELATED;
         data.css = "bottom right";
         data.top = item.offset().top - 170 + APP.scrollTop;
         data.left = item.offset().left - 120;
         data.fixed = false;

         return  data;
      }
   }

   Tutorial.prototype.getNext = function () {
      this.qIndex = this.qIndex || 0;

      return [this.placePhrase, this.fillPath, this.bonus, this.swapWords, this.circleWords, this.relatedWords][this.qIndex++];
   }

   Tutorial.prototype.showNext = function () {
      var func = this.getNext();

      if (!func) {
         localStorage.setItem("tutorial", "end");
         return $.Deferred();
      }

      var base = this;
      var data = func();
      if (data == null) {
         localStorage.setItem("tutorial", "related");
         return null;
      }

      return app.dialog.show("tutorial", data).then(function (obj) {         
         if (obj && obj.force) return $.Deferred();
         return base.showNext();
      });
   }

   Tutorial.prototype.refresh = function () {
      this.qIndex--;
      var func = this.getNext();
      
      app.trigger("dialog:data:changed", func());
   }

   Tutorial.prototype.show = function () {
      var base = this;
      this.qIndex = 0;

      var tutorial = localStorage.getItem("tutorial");

      if (!tutorial) {
         this.showNext();
      }

      switch (tutorial) {
         case "related":
            this.qIndex = 5;
            this.showNext();
            break;
      }

      var base = this;
      var res = app.on("app:resized:delayed").then(function () {
         var tutorial = localStorage.getItem("tutorial");
         if (!tutorial) {
            base.refresh();
         } else {
            res.off();
         }
      });
   }

   Tutorial.prototype.testRelated = function () {
      var tutorial = localStorage.getItem("tutorial");

      if (tutorial == "related") {
         this.qIndex = 5;
         this.showNext();
      }
   };

   var t = new Tutorial();

   app.on("game:score:done").then(function () {
      if (ctx._gameOver() && !ctx.player.resigned()) {
         if (!localStorage.getItem("tutorial-menu")) {
            setTimeout(function () {
               t.archivedGames();
               localStorage.setItem("tutorial-menu", true);
            }, 2000);
         }
      }
   });

   return t;
});