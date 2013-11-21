define(['durandal/app', 'api/datacontext'], function (app, ctx) {

  function Loading() {
    this.loadingStatus = ctx.loadingStatus;
    this.loading = ctx.loading;

    this.duration = 400;
  }

  Loading.prototype.activate = function (data) {
  }

  Loading.prototype.bindingComplete = function () {
    
  }

  Loading.prototype.attached = function (el) {
    this.el = $('.loading', el);    
    app.inlineLoading(true);

    this.el.css({
      top: ($(window).innerHeight() - this.el.outerHeight()) / 2
    });
      
    this.el.css({ y: -100, display: 'block', opacity: 0 })
      .transition({ y: 20, opacity: .8 }, this.duration, 'ease')
      .transition({ y: 0, opacity: 1 }, this.duration / 2, 'ease');
  }

  Loading.prototype.canDeactivate = function (a, s, d) {
    var base = this;
    return $.Deferred(function (dfd) {
      app.inlineLoading(false);
      base.el.promise().then(function () { dfd.resolve(true); });
    }).promise();
  }

  return Loading;  
});