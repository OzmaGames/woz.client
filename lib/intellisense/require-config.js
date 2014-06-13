/// <reference path="~/lib/intellisense/facebook.js" />

require.config( {
    baseUrl: "/app/",
    paths: {
       "text": "../lib/intellisense/text",
       'durandal': '../lib/durandal',
       'plugins': '../lib/durandal/plugins',
       'transitions': '../lib/durandal/transitions',
       'crypto.sha3': '../lib/crypto.sha3',
       'firebase': '../lib/firebase',
       'sounds': '../sounds'
    }
} );

define( 'jquery', [], function () { return jQuery; } );
define( 'knockout', [], function () { return ko; } );
define( 'socket', [], function () { return io; } );
define( 'paper', [], function () { return paper; } );
define( 'facebook', [], function () { return FB; } );

//define( ['api/datacontext'], function (ctx) {
//   ctx
//} )