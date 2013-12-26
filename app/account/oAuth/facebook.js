define(["durandal/app", "./FB"], function (app, FB) {
   
   FB.getStatus(true).then(function (facebook) {
      console.log(facebook);
   });

   function ctor() {
      this.login = function () {
         FB.login().then(function (facebook) {
            console.log(facebook);
         });
      }    
   }

   ctor.prototype.activate =function () {
      app.palette.get("menu").visible(false);
   }

   ctor.prototype.detached = function () {
      app.palette.get("menu").visible(true);
   }

   return ctor;
});