requirejs.config({
   paths: {
      'text': '../lib/requirejs-text/text',
      'durandal': '../lib/durandal',
      'plugins': '../lib/durandal/plugins',
      'transitions': '../lib/durandal/transitions',
      //'paper': '../lib/paper/paper',
      //'socket': '../lib/socket.io',
      'crypto.sha3': '../lib/crypto.sha3',
      'facebook': '//connect.facebook.net/en_US/all'
   },
   urlArgs: 't' + (new Date).getTime(),
   shim: {
      'facebook': {
         'export': 'FB'
      }
   }
});

define('jquery', function () { return jQuery; });
define('knockout', ko);
define('socket', io);
define('paper', paper);

define(['durandal/system', 'durandal/app', 'plugins/router', 'durandal/viewLocator', 'common'],
  function (system, app, router, viewLocator) {
     //>>excludeStart("build", true);
     system.debug(true);
     //>>excludeEnd("build");    

     app.title = 'Words of Oz';

     app.configurePlugins({
        router: true
     });

     app.start().then(function () {
        viewLocator.useConvention();
        app.setRoot('shell', null, 'app');
     });

     if (document.body.style.backgroundPositionX === undefined) {
        loadCSS('_sprites');
     }

     if (document.body.style.MozAppearance !== undefined) {
        loadCSS('_firefox');
     }

     if (!app.browser.android) {
        loadCSS('_ipad');
     }

     function loadCSS(css) {
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