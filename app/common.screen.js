define(['durandal/app', './common.modernizer'], function (app) {
      var resizeHelperId = null, resizeHelperLongId = null;
      var resizeDelay = 200, resizeDelayLong = 600;

      app.screen = {
         size: {
            width: 0,
            height: 0
         }
      }

      updateScreenSize();

      window.addEventListener("resize", function (e) {
         if (updateScreenSize()) {
            app.trigger("app:resized:hook", e);

            clearTimeout(resizeHelperId);
            resizeHelperId = setTimeout(function (event) {
               app.trigger("app:resized", event);
            }, resizeDelay, e);

            clearTimeout(resizeHelperLongId);
            resizeHelperLongId = setTimeout(function (event) {
               app.trigger("app:resized:delayed", event);
            }, resizeDelayLong, e);
         }
      }, false);

      window.addEventListener('orientationchange', function (e) {
         setTimeout(function () {
            if (app.browser.android) {
               var height = window.outerHeight - window.innerHeight == 54 ? window.outerHeight : window.innerHeight;
               $(app.el).css({ 'minHeight': height + 'px' });
            }
            if (updateScreenSize()) {
               app.trigger("app:resized:hook", e);
               app.trigger("app:resized", e);
            }
            app.trigger("app:force-resize");

         }, 600);
      });

      if (app.browser.android) {
         var height = window.outerHeight - window.innerHeight == 54 ? window.outerHeight : window.innerHeight;
         $(app.el).css({ 'minHeight': height + 'px' });
      }

      function updateScreenSize() {
         var w = app.screen.size.width - window.innerWidth;
         var h = app.screen.size.height - window.innerHeight;

         app.screen.size.width -= w;
         app.screen.size.height -= h;
         
         return w || h;
      }

      var APP = app.el;
      
      function resetScroll() {
         return $.Deferred(function (dfd) {
            var SHELL = document.getElementById("shell");

            $(SHELL).delay(1).promise().then(function () {
               $(SHELL).css({
                  y: 0,
                  transition: 'all .5s ease-in-out'
               }).delay(500).promise().then(function () {
                  $(SHELL).css({ transition: 'none', transform: 'none' });
                  $('#app, body').trigger("scroll");
                  app.trigger( "app:force-resize" );

                  dfd.resolve();
               });
            });
         })         
      }

      app.scrollUp = function (opt) {
         console.log("Scrolling UP");
         opt = opt || {};

         if (opt.noAnimate) {
            APP.scrollTop = 0;
            return;
         }

         var SHELL = document.getElementById("shell");

         if (APP.scrollTop != 0) {

            $(SHELL).css({
               y: -APP.scrollTop,
            });
            APP.scrollTop = 0;

            return resetScroll();
         }
         //$(APP).animate({ scrollTop: 0 }, "slow", "swing");
      };

      app.scrollDown = function (proportion, showScroll) {
         console.log("Scrolling Down");

         var SHELL = document.getElementById("shell");

         var pos = APP.scrollHeight - APP.clientHeight;
         if ($('#gameboard').length) {
            var maxPos = $('#gameboard').outerHeight() - 100;
            if (maxPos < pos) pos = maxPos;
         }
         proportion = proportion || (pos - APP.scrollTop);

         if (proportion > (pos - APP.scrollTop)) proportion = (pos - APP.scrollTop);

         if (proportion != 0) {
            $(SHELL).css({
               y: proportion,
            });
            APP.scrollTop = proportion + APP.scrollTop;

            return resetScroll();
         }
         //$(APP).animate({ scrollTop: proportion + APP.scrollTop }, "slow", "swing");
      }
   });