require.config({
    baseUrl: "/app/",
    paths: {
       "text": "../lib/intellisense/text",
       'durandal': '../lib/durandal',
       'plugins': '../lib/durandal/plugins',
       'transitions': '../lib/durandal/transitions',
       'crypto.sha3': '../lib/crypto.sha3',
       'facebook': '//connect.facebook.net/en_US/all',       
       'firebase': '../lib/firebase',
       'sounds': '../sounds'
    }
} );

define( 'jquery', [], function () { return jQuery; } );
define( 'knockout', [], function () { return ko; } );
define( 'socket', [], function () { return io; } );
define( 'paper', [], function () { return paper; } );



//define( ['api/datacontext'], function (ctx) {
//   ctx
//} )