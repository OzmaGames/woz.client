define(['durandal/app'], function (app) {
   app.browser = {};
   app.browser.iPad = navigator.userAgent.match(/iPad/i);
   app.browser.kindle = navigator.vendor.match(/amazon\.com/i);
   app.browser.android = navigator.userAgent.match(/android/i) || app.browser.kindle;
   app.browser.tablet = app.browser.iPad || app.browser.android;

   app.el = document.getElementById('app');   
});