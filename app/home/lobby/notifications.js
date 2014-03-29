define(['durandal/app', 'api/datacontext'], function ( app, ctx) {
   
   function ctor() {
      this.list = ko.observableArray();
   }

   ctor.prototype.activate = function () {
      var base = this;

      app.trigger("server:game:lobby", { username: ctx.username }, function (data) {
         if (data.success) {
            data.games.sort(function (a, b) { return b.modDate - a.modDate; });

            base.list(data.games);            
         }
      });
   }

   ctor.prototype.detached = function () {

   }

   return ctor;
});