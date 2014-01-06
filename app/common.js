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

      window.addEventListener("resize", function (e) {
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

      app.scrollUp = function (showScroll) {
         console.log("Scrolling UP");
         if (APP.scrollTop == 0) return;
         
         if (!showScroll) APP.classList.add('noScroll');
         var SHELL = document.getElementById("shell");
         $(SHELL).css({
            y: -APP.scrollTop
         }).removeClass('noTransform');
         APP.scrollTop = 0;

         $(SHELL).delay(1).promise().then(function () {
            $(SHELL).addClass('transition').addClass('noTransform').delay(500).promise().then(function () {
               $(SHELL).removeClass("transition");
               if (!showScroll) APP.classList.remove('noScroll');
               $('#app').trigger("scroll");
            })
         });
         
         //$('#app').animate({ scrollTop: 0 }, "slow", "swing");
      };

      app.scrollDown = function (proportion, showScroll) {
         console.log("Scrolling Down");
         if (!showScroll) APP.classList.add('noScroll');

         var SHELL = document.getElementById("shell");
         var pos = APP.scrollHeight - APP.clientHeight;

         proportion = proportion || pos - APP.scrollTop;
         $(SHELL).css({
            y: proportion
         }).removeClass('noTransform');
         APP.scrollTop = proportion + APP.scrollTop;
                  
         $(SHELL).delay(1).promise().then(function () {
            $(SHELL).addClass('transition').addClass('noTransform').delay(500).promise().then(function () {
               $(SHELL).removeClass("transition");
               if (!showScroll) APP.classList.remove('noScroll');
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


      app.console = {
         log: function (str) {
            $('#console').html(str);
         }
      }      
   });