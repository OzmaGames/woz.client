"use strict";
define('common',
   ['durandal/system', 'durandal/app', 'plugins/router',
    'dialogs/_builder', 'api/server/setup', 'api/datacontext', './palette',
    '../lib/jquery.transit', '../lib/jquery.touch-punch', '../lib/crypto.sha3', 'api/knockout'],
   function (system, app, router, Dialog, server, ctx, palette) {
      var scrollable = true;

      if (navigator && navigator.splashscreen) navigator.splashscreen.hide();

      (function (app) {
         app.browser = {};
         app.browser.iPad = navigator.userAgent.match(/iPad/i);
         app.browser.kindle = navigator.vendor.match(/amazon\.com/i);
         app.browser.android = navigator.userAgent.match(/android/i) || app.browser.kindle;
         app.browser.tablet = app.browser.iPad || app.browser.android;

         app.el = document.getElementById('app');
         //if (app.browser.android) {
         //   app.el = document.body;
         //}         
      })(app);

      (function (app) {
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

            //setTimeout(function () {
            //   paper.view
            //}, 1000);
            ////600 is important, as in 500ms the new screen size is updated
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
         
            //alert(w + ' ' + h);
            return w || h;
         }

         var loading = ko.observable(false);
         app.inlineLoading = ko.observable(false);
         app.loading = ko.computed({
            read: function () {
               return loading() || ctx.loading() === true;
            },
            write: function (value) {
               loading(value);
            },
            owner: this
         });

      })(app);

      var APP = app.el;      

      function resetScroll() {
         var SHELL = document.getElementById("shell");        

         $(SHELL).delay(1).promise().then(function () {
            $(SHELL).css({
               y: 0,
               transition: 'all .5s ease-in-out'
            }).delay(500).promise().then(function () {
               $(SHELL).css({ transition: 'none', transform: 'none' });
               $('#app, body').trigger("scroll");
            });
         });
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

            resetScroll();
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

            resetScroll();

         }
         //$(APP).animate({ scrollTop: proportion + APP.scrollTop }, "slow", "swing");
      }

      app.navigate = function (hash, options) {
         router.navigate(hash, options);
      }

      app.dialog = Dialog;
      app.palette = palette;
      app.palette.get("menu").click(function () { app.dialog.show("menu"); });
      if (app.browser.tablet) {
         app.palette.get("fullscreen").hide()
      }

      app.console = {
         log: function (str) {
            $('#console').html(str);
         }
      }

      var isFullscreen = false;
      app.on("app:fullscreen").then(function () {
         var html = $('html')[0];

         if (isFullscreen) {
            html.webkitCancelFullscreen();
         } else {
            if (html.webkitRequestFullscreen)
               html.webkitRequestFullscreen();
            else if (html.webkitEnterFullScreen)
               html.webkitEnterFullscreen();
         }
      });

      //alert(
      //   'user agent: ' + navigator.userAgent +
      //   '\nplatform: ' + navigator.platform +
      //   '\nappName: ' + navigator.appName +
      //   '\nappVersion: ' + navigator.appVersion +
      //   '\nvendor: ' + navigator.vendor +
      //   '\nvendorSub: ' + navigator.vendorSub +
      //   '\nproduct: ' + navigator.product
      //   );

      //alert(app.browser.iPad);
      //alert(screen.availHeight + ' ' + screen.height + ' ' + outerHeight + ' ' + innerHeight);
      
   });