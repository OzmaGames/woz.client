define(['durandal/app'], function (app) {

    return {
        activate: function () {
            
        },
        loading: app.loading,

        close: function () {
            app.dialog.close('panel');
        }
    };
});