define(['durandal/app', 'api/datacontext', 'dialogs/_constants'], function (app, ctx, consts) {
   TUT = consts.TUT;

   function Tutorial() {
      this.swapWords = function () {
         var item = $('.palette.left .btn:first');

         var data = TUT.SWAP_WORDS;
         data.css = "left";
         data.top = item.offset().top - 40;
         data.left = item.offset().left + 60;

         return app.dialog.show("tutorial", data);
      }

      this.circleWords = function () {
         var item = $('.palette.left .btn:nth-child(2)');

         var data = TUT.SELECT_PHRASE;
         data.css = "left";
         data.top = item.offset().top;
         data.left = item.offset().left + 60;

         return app.dialog.show("tutorial", data);
      }

      this.workspace = function () {
         var item = $('#workspace');

         var data = TUT.WORKSPACE;
         data.css = "bottom right";
         data.top = item.offset().top - 150;
         data.left = 200;

         return app.dialog.show("tutorial", data);
      }

      this.gameboard = function () {
         var item = $('#gameboard');

         var data = TUT.GAMEBOARD;
         data.css = "bottom left";
         data.top = item.offset().top + 200;
         data.left = 300;

         return app.dialog.show("tutorial", data);
      }

      this.bonus = function () {
         var item = $('.cloud:first');

         var data = TUT.BONUS;
         data.css = "bottom left";
         data.top = item.offset().top - 110;
         data.left = item.offset().left + 20;

         return app.dialog.show("tutorial", data);
      }

      this.relatedWords = function () {
         var item = $('.magnet.related:first');

         var data = TUT.RELATED;
         data.css = "bottom right";
         data.top = item.offset().top - 160;
         data.left = item.offset().left - 120;

         return app.dialog.show("tutorial", data);
      }
   }

   Tutorial.prototype.show = function () {
      var base = this;
      base.swapWords().then(function () {
         base.circleWords().then(function () {
            base.workspace().then(function () {
               base.relatedWords().then(function () {
                  base.gameboard().then(function () {
                     base.bonus().then(function () {

                     });
                  });
               });
            });
            var h;
            $('#app').one("scroll", function () {
               clearTimeout(h);
               h = setTimeout(function () {
                  app.dialog.close("tutorial");
               }, 100);
            });
         });
      });
   }

   return new Tutorial();
});