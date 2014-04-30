define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   function Currency() {
      
      var base = this;

      this.loading = ctx.shop.loading();
      this.list = ctx.shop.besozes;
      ctx.shop.besozes.load();

      this.buy = function ( item ) {
         ctx.user.buyBesoz( item.besoz ).then( function () {
            app.dialog.close("notice").then( function () {
               app.dialog.showBesozBought();
            } );            
         } );
      }

      ko.computed( function () {
         if ( !ctx.shop.loading() ) {
            app.trigger( "dialog:adjust-size" );
         }
      } );
   }

   return new Currency;
});