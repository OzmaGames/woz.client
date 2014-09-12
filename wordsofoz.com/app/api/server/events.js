define( ['durandal/app', 'api/helper/history', 'api/helper/Log'], function ( app, history, LOG ) {

   return {
      emission: [
        "account:login",
        "account:sign-up",
        "account:recover-password",        
        "account:fb",
        "top-phrases"
      ],
      init: function ( socket ) {
      },
      custom: {
      }
   }

} );