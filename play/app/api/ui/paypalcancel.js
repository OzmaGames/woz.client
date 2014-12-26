define('api/ui/paypalcancel', [], function () {
    return {
        getView: function () {
            return $('<div/>').get(0);
        },
        activate: function () {
            ga('send', 'event', 'paypal', 'canceled');

            app.navigate('#newGame');
            Task.run(function () {
                app.dialog.showBesozCancel();
            }, 1000);            
        },
        loading: app.loading
    };
});