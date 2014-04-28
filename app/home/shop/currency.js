define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   function Currency() {

      var base = this;

      this.loading = ctx.shop.loading();
      this.list = ctx.shop.besozes;
      ctx.shop.besozes.load();

      this.buy = function (item) {
         ctx.user.buyBesoz( item.besoz );
      }
   }

   return Currency;
});