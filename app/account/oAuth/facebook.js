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
      palette.get("menu").visible(false);
      palette.get("currency").visible(false);
   }

   ctor.prototype.detached = function () {
      palette.get("menu").visible(true);
      palette.get("currency").visible(true);
   }

   return ctor;
});