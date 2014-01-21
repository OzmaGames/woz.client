"use strict";
define('common',
   ['durandal/system', 'durandal/app', 'plugins/router',
    'dialogs/_builder', 'api/server/setup', 'api/datacontext', './palette',
    '../lib/jquery.transit', '../lib/jquery.touch-punch', '../lib/crypto.sha3', 'api/knockout'],
   function (system, app, router, Dialog, server, ctx, palette) {
      var resizeHelperId = null;
      var resizeDelay = 100;
      var scrollable = true;
      var APP = document.getElementById('app');

      app.browser = {};
      app.browser.iPad = navigator.userAgent.match(/iPad/i);
      app.browser.kindle = navigator.vendor.match(/amazon\.com/i);      
      app.browser.android = navigator.userAgent.match(/android/i) || app.browser.kindle;
      app.browser.tablet = app.browser.iPad || app.browser.kindle || app.browser.android;

      if (app.browser.android) {
         APP = document.body;         
      } else {

      }

      app.el = APP;

      window.addEventListener("resize", function (e) {
         app.trigger("app:resized:hook", event);
         setTimeout(function () {
            app.trigger("app:resized:instant", event);
         }, 0);
         clearTimeout(resizeHelperId);
         resizeHelperId = setTimeout(function (event) {
            app.trigger("app:resized", event);
         }, resizeDelay, e);
      }, false);

      //app.on("app:resized").then(function () {
      //   app.console.log("resized");
      //});
      //document.addEventListener("touchmove", function (e) {
      //   app.console.log("prevented ");
      //   e.preventDefault();
      //}, false);

      //APP.addEventListener('touchstart', function (e) {
      //   if (e.currentTarget.scrollTop === 0) {
      //      e.currentTarget.scrollTop = 1;
      //   } else if (e.currentTarget.scrollHeight === e.currentTarget.scrollTop + e.currentTarget.offsetHeight) {
      //      e.currentTarget.scrollTop -= 1;
      //   }
      //}, false);

      //APP.addEventListener("touchmove", function (e) {         
      //   e.stopPropagation();
      //}, false);

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

      function resetScroll() {

         var SHELL = document.getElementById("shell");
         if (app.browser.tablet && !app.browser.iPad) SHELL = APP;         

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

      app.scrollUp = function (showScroll) {
         console.log("Scrolling UP");

         var SHELL = document.getElementById("shell");
         if (app.browser.android) SHELL = APP;

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
         if (app.browser.android) SHELL = APP;     

         var pos = APP.scrollHeight - APP.clientHeight;
         if ($('#gameboard').length) {
            var maxPos = $('#gameboard').outerHeight() - 100;            
            if (maxPos < pos) pos = maxPos;
         }
         proportion = proportion || (pos - APP.scrollTop);

         if (proportion != 0) {
            if (app.browser.android) {
               $(APP).animate({ scrollTop: proportion + APP.scrollTop }, "slow", "swing");
            } else {
               $(SHELL).css({
                  y: proportion,
               });
               APP.scrollTop = proportion + APP.scrollTop;

               resetScroll();
            }
         }
      }

      app.navigate = function (hash, options) {
         router.navigate(hash, options);
      }

      app.dialog = Dialog;
      app.palette = palette;
      app.palette.get("menu").click(function () { app.dialog.show("menu"); });
      app.palette.fixedItemsCount = app.browser.tablet ? 2 : 3;

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

      //alert(navigator.userAgent);
      //alert(navigator.platform);
      //alert(navigator.appName);
      //alert(navigator.connectionSpeed);
      //alert(navigator.vendor);

   });