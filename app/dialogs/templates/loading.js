define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   function Loading() {
      this.loadingStatus = ctx.loadingStatus;
      this.loading = ctx.loading;

      this.duration = 400;
   }

   Loading.prototype.activate = function (data) {
   }

   Loading.prototype.binding = function (el) {
      this.el = $('.loading', el);
   }
   Loading.prototype.bindingComplete = function (el) {
      this.el = $('.loading', el);

      $('.block', this.el).css({ scale: .5, opacity: 0 });
   }

   Loading.prototype.compositionComplete = function (el) {
      this.el = $('.loading', el);
      app.inlineLoading(true);

      this.el.css({
         top: ($(window).innerHeight() - this.el.outerHeight()) / 2
      });

      $('.block', this.el).css({ opacity: 1, scale: 1 });
   }

   Loading.prototype.canDeactivate = function (a, s, d) {
      var base = this;      
      return $.Deferred(function (dfd) {
         app.inlineLoading(false);
         dfd.resolve(true);         
      }).promise();
   }

   return Loading;
});