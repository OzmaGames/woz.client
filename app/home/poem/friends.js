define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   function ctor() {

      var base = this;

      this.loading = ctx.shop.loading();
      this.list = ctx.shop.storageSpaceList;
      ctx.shop.storageSpaceList.load();

      this.storage = ctx.user.storage;
      this.buy = function (item) {
         ctx.user.buyStorageSpace( item ).then( function () {
            //app.dialog.showBesozBought();
         } );         
      }
   }

   return ctor;
});