﻿define(['durandal/app', 'api/datacontext', 'api/paypal'], function (app, ctx, paypal) {

   function Currency() {
      
      var base = this;

      this.loading = ctx.shop.loading();
      this.list = ctx.shop.besozes;
      ctx.shop.besozes.load();

      this.buy = function ( item ) {

          app.dialog.closeAll();
          app.dialog.show("loading");
          ctx.loading(true);
          ctx.loadingStatus("Waiting for the server...");
          ctx.loadingBox(true);

          paypal.getToken(item).then(function (json) {
              if (json.success) {
                  app.palette.dispose();

                  ctx.loadingStatus("Waiting for Paypal...");
                  localStorage.setItem('returnedHash', location.hash);
                  window.location = json.link;
              } else {
                  ctx.loading(false);
                  ctx.loadingBox(false);

                  app.dialog.close("loading");
              }
          });
         //app.dialog.show( "panel", { module: 'api/ui/paymentwall', fixed: true, css: 'payment' } );

         //ctx.user.buyBesoz( item.besoz ).then( function () {
         //   app.dialog.close("notice").then( function () {
         //      app.dialog.showBesozBought();
         //   } );            
         //} );
      }      
   }

   return new Currency;
});