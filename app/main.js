requirejs.config({
   paths: {
      'text': '../lib/requirejs-text/text',
      'durandal': '../lib/durandal',
      'plugins': '../lib/durandal/plugins',
      'transitions': '../lib/durandal/transitions',      
      'crypto.sha3': '../lib/crypto.sha3',
      'facebook': '//connect.facebook.net/en_US/all',
      //'firebase': '//cdn.firebase.com/js/client/1.0.11/firebase',
      'firebase': '../lib/firebase',
      'sounds': '../sounds'
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
define('paper', paper );

define(['durandal/system', 'durandal/app', 'plugins/router', 'durandal/viewLocator', 'api/Sound', 'common'],
  function (system, app, router, viewLocator, Sound) {
     //>>excludeStart("build", true);
     system.debug(true);
     //>>excludeEnd("build");    
     
     app.title = 'Words of Oz';

     app.configurePlugins({
        router: true,
        widget: {
           kinds: ['list', 'slider', 'tile', 'xp']
        }
     } );

     app.Sound = Sound;
     var loadingBar = $( '#loadingBar' );
     app.Sound.onLoad = function ( percent ) {
        loadingBar.val( percent );
     }
     app.Sound.load();

     app.Sound.loaded.then( function () {
        app.start().then( function () {
           viewLocator.useConvention();
           app.setRoot( 'shell', null, 'app' );
        } );
     } )
     
     app.fromSignUp = (localStorage.getItem('login-mode') == 'signup');


     if (navigator && navigator.splashscreen) navigator.splashscreen.hide();

     if (document.body.style.backgroundPositionX === undefined) {
        loadCSS('_sprites');
     }

     if ( !app.support.flex ) {
        loadCSS( '_flex' );
     }
     
     if (document.body.style.MozAppearance !== undefined) {
        loadCSS('_firefox');
     }

     if (app.browser.iPad) {
        loadCSS('_ipad');
     }

     if ($.support.touch) {
        loadCSS('_touch');
     }

     if (app.browser.kindle) {
        if (screen.lockOrientation)
           screen.lockOrientation(["landscape-primary", "landscape-secondary"]);

        loadCSS('_kindle')
     }

     function loadCSS(css) {
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = 'css/' + css + '.css';
        document.getElementsByTagName("head")[0].appendChild(link);
     }          
     
     window.app = app;
  });