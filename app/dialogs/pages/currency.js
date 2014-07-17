define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   function Currency() {
      
      var base = this;

      this.loading = ctx.shop.loading();
      this.list = ctx.shop.besozes;
      ctx.shop.besozes.load();

      this.buy = function ( item ) {

         app.dialog.show( "panel", { module: 'api/ui/paymentwall', fixed: true, css: 'payment' } );

         //ctx.user.buyBesoz( item.besoz ).then( function () {
         //   app.dialog.close("notice").then( function () {
         //      app.dialog.showBesozBought();
         //   } );            
         //} );
      }      
   }

   return new Currency;
});