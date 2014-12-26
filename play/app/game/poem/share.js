define('game/poem/share', ['api/datacontext', 'api/helper/facebook', 'api/helper/CanvasCapture'], function (ctx, facebook, CanvasCapture) {

    var ctor = function () {
        this.heading = 'Share with friends!';
        this.valid = ko.observable(true);
        this.btnNextCaption = 'Save';
        this.btnNextFn = this.save;

        this.reset = function () {

        }
    }



    ctor.prototype.activate = function () {
        this.tile = ctx.poem.tile;
        this.title = ctx.poem.title;
        this.phrases = ctx.poem.chosenPhrases;
        this.settings = ctx.poem.settings;
    }

    ctor.prototype.compositionComplete = function (el) {
        //this.el = el;
        //return $( this.el ).hide().slideDown().promise();
        //app.trigger( "dialog:adjust-size" );
        ctx.poem.title.valueHasMutated();
    }

    ctor.prototype.facebook = function () {
        ga('send', 'event', 'poem', 'share', 'facebook');

        facebook.PublishImage.login();
        CanvasCapture.capture($('.slider'), ctx.poem.tile().imageName, ctx.poem.settings.size.value()).then(function (canvas) {
            facebook.PublishImage.publishImageUI(canvas);
        });

    }

    return ctor;

});