define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   function Currency() {

      var base = this;

      this.loading = ctx.shop.loading();
      this.list = ctx.shop.storageSpaceList;
      ctx.shop.storageSpaceList.load();

      this.storage = ctx.user.storage;
      this.buy = function (item) {
          ctx.user.buyStorageSpace(item).then(function () {
              app.dialog.showAlertNote({
                  title: 'Thank you!',
                  content: 'You have successfully received more storage space for your archived games.'
              });
         } );         
      }
   }

   return Currency;
});