define(['durandal/app', 'api/datacontext', 'dialogs/_constants'], function (app, ctx, consts) {
   TUT = consts.TUT;

   var APP = document.getElementById("app");

   function Tutorial() {
      this.swapWords = function () {
         var item = $('.palette.left .btn:first');

         var data = TUT.SWAP_WORDS;
         data.css = "left";
         data.top = item.offset().top + APP.scrollTop;
         data.left = item.offset().left + 60;

         return app.dialog.show("tutorial", data);
      }

      this.circleWords = function () {
         var item = $('.palette.left .btn:nth-child(2)');

         var data = TUT.SELECT_PHRASE;
         data.css = "left";
         data.top = item.offset().top + APP.scrollTop;
         data.left = item.offset().left + 60;

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
         var item = $('.cloud:first .info');

         var data = TUT.BONUS;
         data.css = "bottom left";
         data.top = item.offset().top - 130 + APP.scrollTop;
         data.left = item.offset().left + 20;

         return app.dialog.show("tutorial", data);
      }

      this.relatedWords = function () {
         var item = $('.magnet.related:first');
         if (item.length == 0) {
            return $.Deferred(function (dfd) { dfd.resolve(); })
         }

         var data = TUT.RELATED;
         data.css = "bottom right";
         data.top = item.offset().top - 160 + APP.scrollTop;
         data.left = item.offset().left - 120;

         return app.dialog.show("tutorial", data);
      }
   }

   Tutorial.prototype.show = function () {
      var base = this;
      base.swapWords().then(function (obj) {
         if (obj && obj.force) return;
         base.circleWords().then(function (obj) {
            if (obj && obj.force) return;
            //base.workspace().then(function (obj) {
            // if (obj && obj.force) return;
            base.relatedWords().then(function (obj) {
               if (obj && obj.force) return;
               //base.gameboard().then(function (obj) {
               //   if (obj && obj.force) return;
               //   base.bonus().then(function (obj) {

               //   });
               //});
            });
            //});
            //$('#app').one("scroll", close);
            //function close() {
            //   setTimeout(function () {
            //      app.dialog.close("tutorial");
            //   }, 500);
            //}
         });
      });
   }

   return new Tutorial();
});