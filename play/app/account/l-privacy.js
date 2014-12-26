define(['durandal/app'], function (app) {

    return {
        activate: function () {
            
        },
        loading: app.loading,

        close: function () {
            app.trigger('account:view:change', 'account/sign-up');
        }
    };
});