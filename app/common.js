"use strict";
define('common',
   ['durandal/system', 'durandal/app', 'plugins/router',
    'dialogs/_builder', 'api/server/setup', 'api/datacontext', './palette',
    '../lib/jquery.transit', '../lib/jquery.touch-punch', '../lib/crypto.sha3', 'api/knockout'],
   function (system, app, router, Dialog, server, ctx, palette) {
      var resizeHelperId = null;
      var resizeDelay = 100;

      window.addEventListener("resize", function (e) {
         clearTimeout(resizeHelperId);
         resizeHelperId = setTimeout(function (event) {
            app.trigger("app:resized", event);
         }, resizeDelay, e);
      }, false);

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

      app.scrollUp = function () {
         console.log("Scrolling UP");

         var APP = document.getElementById('app'),
            SHELL = document.getElementById("shell");

         $(SHELL).css({
            y: -APP.scrollTop
         }).removeClass('noTransform');
         APP.scrollTop = 0;

         $(SHELL).delay(1).promise().then(function () {
            $(SHELL).addClass('transition').addClass('noTransform').delay(500).promise().then(function () {
               $(SHELL).removeClass("transition");
               $('#app').trigger("scroll");
            })
         });
         
         //$('#app').animate({ scrollTop: 0 }, "slow", "swing");
      };

      app.scrollDown = function () {
         console.log("Scrolling Down");

         var APP = document.getElementById('app'),
            SHELL = document.getElementById("shell");

         var pos = APP.scrollHeight - APP.clientHeight;
         $(SHELL).css({
            y: pos - APP.scrollTop
         }).removeClass('noTransform');
         APP.scrollTop = pos;
                  
         $(SHELL).delay(1).promise().then(function () {
            $(SHELL).addClass('transition').addClass('noTransform').delay(500).promise().then(function () {
               $(SHELL).removeClass("transition");
               $('#app').trigger("scroll");
            })
         });

         //$('#app').animate({ scrollTop: 1000 }, "slow", "swing");
      }

      app.navigate = function (hash, options) {
         router.navigate(hash, options);
      }

      app.dialog = Dialog;
      app.palette = palette;
      app.palette.get("menu").click(function () { app.dialog.show("menu"); });
   });