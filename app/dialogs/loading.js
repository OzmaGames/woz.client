define(['durandal/app', 'api/datacontext'], function (app, ctx) {

  ko.bindingHandlers.fadeVisible = {
    init: function (element, valueAccessor) {
      // Initially set the element to be instantly visible/hidden depending on the value
      var value = valueAccessor();
      $(element).toggle(ko.utils.unwrapObservable(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
    },
    update: function (element, valueAccessor) {
      // Whenever the value subsequently changes, slowly fade the element in or out
      var value = valueAccessor();
      ko.utils.unwrapObservable(value) ? $(element).fadeIn(200) : $(element).fadeOut(500);
    }
  };

  function Loading() {
    this.loadingStatus = ctx.loadingStatus;
    this.loading = ctx.loading;
  }

  Loading.prototype.activate = function (data) {
    
  }

  Loading.prototype.attached = function (el) {
    this.el = $('.loading', el);

    this.el.css({
      top: ($(window).innerHeight() - this.el.outerHeight()) / 2,
    });

    this.el.css({ y: -100, display: 'block', opacity: 0 })
      .transition({ y: 20, opacity: .8 }, duration, 'ease')
      .transition({ y: 0, opacity: 1 }, duration / 2, 'ease');
  }

  Loading.prototype.canDeactivate = function (a, s, d) {
    var base = this;
    return $.Deferred(function (dfd) {
      base.el.promise().then(function () { dfd.resolve(true); });
    }).promise();
  }

  return Loading;  
});