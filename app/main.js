requirejs.config({
   paths: {
      'text': '../lib/requirejs-text/text',
      'durandal': '../lib/durandal/',
      'plugins': '../lib/durandal/plugins',
      'transitions': '../lib/durandal/transitions',
      'paper': '../lib/paper/paper',
      'socket': '../lib/socket.io',
      'crypto.sha3': '../lib/crypto.sha3',

      'transitions/slidedown': 'api/transitions/slidedown'
   },
   urlArgs: 't' + (new Date).getTime()
});

define('jquery', function () { return jQuery; });
define('knockout', ko);

define([
   'durandal/system', 'durandal/app', 'durandal/plugins/router',
   'durandal/viewLocator', 'api/server/setup', 'api/datacontext', 'dialogs/_builder', './palette',
  '../lib/jquery.transit', '../lib/jquery.touch-punch', '../lib/crypto.sha3', 'api/knockout'],
  function (system, app, router, viewLocator, server, ctx, Dialog, palette) {
     //>>excludeStart("build", true);
     system.debug(true);
     //>>excludeEnd("build");    

     app.title = 'Words of Oz';

     app.configurePlugins({
        router: true,
        dialog: true,
        http: true
     });

     app.inlineLoading = ko.observable(false);
     app._loading = ko.observable(false);
     app.loading = ko.computed({
        read: function () {
           return app._loading() || (ctx.loading() === true);
        },
        write: function (value) {
           app._loading(value);
        },
        owner: this
     });

     app.scrollUp = function () {
        console.log("scrollUP");
        $('body, #app').animate({ scrollTop: 0 }, "slow", "swing");
     };

     app.scrollDown = function () {
        console.log("scrollDown");
        $('body, #app').animate({ scrollTop: 1000 }, "slow", "swing");
     }
     app.navigate = function (hash, options) {
        router.navigate(hash, options);
     }

     app.dialog = Dialog;
     app.palette = palette;
     app.palette.get("menu").click(function () { app.dialog.show("menu"); });

     app.start().then(function () {
        viewLocator.useConvention();
        app.setRoot('shell', null, 'app');
     });

     if (document.body.style.backgroundPositionX === undefined) {
        loadCss('_sprites');
     }

     if (document.body.style.MozAppearance !== undefined) {
        loadCss('_firefox');
     }

     function loadCss(css) {
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = 'css/' + css + '.css';
        document.getElementsByTagName("head")[0].appendChild(link);
     }

     //TODO: loads only in IPAD
     //var touches = [], appEl = document.getElementById('app');
     ////$('#app').bind('scroll', function (e) {
     ////   //if (e.target.id == 'app') {
     ////   if (document.getElementById('debug'))
     ////      document.getElementById('debug').innerHTML += e.target.id + e.target.scrollTop;
     ////   //}
     ////});

     //$('#app').bind('touchstart', function (e) {
     //   for (var i = 0; i < e.originalEvent.touches.length; i++) {
     //      touches[e.originalEvent.touches[i].identifier] = e.originalEvent.touches[i].pageY;
     //   }
     //   if ($(e.target).parents('.scroll').length > 1) {
     //      touches.skip = true;
     //      console.log('skipped');
     //   } else {
     //      touches.skip = false;
     //   }
     //});

     ////manual touch;
     ////$('#app').bind('touchmove', function (e) {
     ////   if (e.originalEvent.changedTouches.length) {
     ////      var curTouch = e.originalEvent.changedTouches[0];
     ////      var scrollAmount = touches[curTouch.identifier].pageY - curTouch.pageY;
     ////      appEl.scrollTop += scrollAmount;

     ////      touches[curTouch.identifier] = curTouch;
     ////      console.log(scrollAmount, touches[curTouch.identifier].pageY, curTouch.pageY);

     ////      e.preventDefault();
     ////   }
     ////});
     //$('body').bind('touchmove', function (e) {
     //   //e.preventDefault();

     //   //if (document.getElementById('debug'))
     //   //   document.getElementById('debug').innerHTML += 'prevented';
     //});

     //$('#app').bind('touchmove', function (e) {
     //   //if (touches.skip) return;

     //   if (document.getElementById('debug'))
     //      document.getElementById('debug').innerHTML = appEl.scrollTop + ' ' + appEl.scrollHeight + ' ' + appEl.clientHeight;

     //   if (appEl.scrollTop < 0 || appEl.scrollTop > appEl.scrollHeight - appEl.clientHeight) {
     //      e.preventDefault();
     //      e.stopPropagation();
     //      if (document.getElementById('debug'))
     //         document.getElementById('debug').innerHTML += 'prevented';
     //      return false;
     //   }
        
     //   var curTouch = e.originalEvent.changedTouches[0];
     //   var scrollAmount = touches[curTouch.identifier] - curTouch.pageY;
     //   //var endScroll = appEl.scrollTop + scrollAmount;
     //   touches[curTouch.identifier] = curTouch.pageY;

     //   if (
     //      (scrollAmount < 0 && appEl.scrollTop <= 0) ||
     //      (scrollAmount > 0 && appEl.scrollTop > appEl.scrollHeight - appEl.clientHeight)) {

     //      e.preventDefault();
     //      e.stopPropagation();
     //      if (document.getElementById('debug'))
     //         document.getElementById('debug').innerHTML += 'prevented';
     //      return false;
     //   }

     //   //console.log(endScroll);           
     //   //e.preventDefault();
     //});

     window.app = app;
  });