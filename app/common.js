"use strict";
define( ['durandal/system', 'durandal/app', 'plugins/router',
    'dialogs/_builder', 'api/server/setup', 'api/datacontext', 'api/ui/palette',
    '../lib/jquery.transit', '../lib/jquery.touch-punch', '../lib/crypto.sha3', 'api/knockout',
    'common.screen', 'api/helper/Task', 'api/helper/issueTracker'],
   function ( system, app, router, Dialog, server, ctx, palette ) {

      var loading = ko.observable( false );
      app.inlineLoading = ko.observable( false );
      app.loading = ko.computed( {
         read: function () {
            return loading() || ctx.loading() === true;
         },
         write: function ( value ) {
            loading( value );
         },
         owner: this
      } );

      app.navigate = function ( hash, options ) {
         router.navigate( hash, options );
      }

      app.ctx = ctx;

      app.dialog = Dialog;
      app.dialog.showCurrency = function () {
         ctx.shop.besozes.load().then( function () {
            app.dialog.show( "notice", {
               model: 'dialogs/pages/currency',
               css: 'long',
               closeOnClick: false,
               fixed: true,
               centered: true,
               modal: true
            } );
         } );
      };
      app.dialog.showNoBesoz = function ( besoz ) {
         app.dialog.show( "notice", {
            model: { getBesoz: app.dialog.showCurrency, besoz: besoz },
            view: 'dialogs/pages/noBesoz',
            closeOnClick: false,
            fixed: true,
            centered: true,
            modal: true
         } );
      };
      app.dialog.showBesozBought = function ( besoz ) {
         app.dialog.show( "notice", {
            view: 'dialogs/pages/besoz',
            fixed: true,
            centered: true
         } );
      };
      app.dialog.confirm = function ( content, opt, callback ) {
         opt = opt || {};
         opt.content = content;
         $.extend( {}, {
            doneText: 'YES',
            cancelText: 'NO'
         }, opt );

         return $.Deferred( function ( dfd ) {
            return app.dialog.show( "confirm", opt ).then( function ( result ) {
               if ( result == "done" ) dfd.resolve( true );
               dfd.reject( false );
            } );
         } ).promise();
      }
      app.dialog.showPoem = function () {
         app.dialog.show( "notice", {
            model: 'game/poem/index',
            css: 'long top up',
            closeOnClick: false,
            fixed: false,
            centered: false,
            modal: true
         } );
      }

      app.palette = palette;
      app.palette.get( "menu" ).click( function () { app.dialog.show( "menu" ); } );
      app.palette.get( "currency" ).click( app.dialog.showCurrency ).content = ctx.user.besoz;
      if ( app.browser.tablet ) {
         app.palette.get( "fullscreen" ).hide()
      }

      app.console = {
         log: function ( str ) {
            $( '#console' ).html( str );
         }
      }

      var isFullscreen = 0;
      app.on( "app:fullscreen" ).then( function () {
         var html = $( 'html' )[0];

         if ( isFullscreen ) {
            document.webkitCancelFullScreen();
         } else {
            if ( html.webkitRequestFullscreen )
               html.webkitRequestFullscreen();
            else if ( html.webkitEnterFullScreen )
               html.webkitEnterFullscreen();
         }

         isFullscreen ^= 1;
      } );

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

   } );