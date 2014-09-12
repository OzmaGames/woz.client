define('api/ui/paypalcb', [], function () {
    return {
        activate: function () {
            app.trigger('server:payment:paypal:confirm', arguments, function (res) {
                if (res.success) {  
                    app.navigate('#newGame');
                }
            });
        },
        loading: app.loading
    };
});