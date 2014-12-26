define( 'api/controllers/authController', ['api/datacontext'], function (ctx) {

   function AuthController() {

   }

   AuthController.prototype.activate = function () {
      return ctx.auth;
   }

   AuthController.prototype.authValidate = function () {
      return ctx.auth;
   }
} );