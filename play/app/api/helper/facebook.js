define('api/helper/facebook', ['api/helper/Canvas', 'api/helper/CanvasCapture', 'facebook'], function (Canvas, CanvasCapture) {

    var auth = { accessToken: "", expiresIn: 0, signedRequest: "", userID: "" };
    var permissions = {
        uploadImages: 'publish_actions'
    }
    window.facebook = window.facebook || {};

    if (app) app.facebook = facebook;

    if (FB) {
        FB.init({
            appId: '447561982032834',
            version: 'v2.0',
            status: false, // check login status
            cookie: true,  // enable cookies to allow the server to access the session
            xfbml: false   // parse XFBML
        });

        FB.Event.subscribe('auth.authResponseChange', function (response) {
            auth = response.authResponse;
            //if ( response.status === 'connected' ) {
            //   app.facebook.status = 2;
            //} else if ( response.status === 'not_authorized' ) {
            //   app.facebook.status = 1;
            //} else {
            //   app.facebook.status = 0;
            //}

            //app.trigger( "oAuth:login", {
            //   gateway: 'facebook',
            //   response: app.facebook
            //} );
        });
    }

    facebook.utils = facebook.utils || {};
    facebook.utils.getProfileImageSrc = function (width, height) {
        width = width || 200;
        height = height || 200;
        return '//graph.facebook.com/' + auth.userID + '/picture?height=' + height + '&width=' + width;
    }
    facebook.utils.getUserInfo = function () {
        var dfd = $.Deferred();

        FB.api('/me', function (json) {
            facebook.user = json;
            facebook.user.profileImageSrc = facebook.utils.getProfileImageSrc();
            dfd.resolve();
        });

        return dfd.promise();
    }

    facebook.PublishImage = (function () {

        function PublishImage() {
            var base = this;

            this.loginState = $.Deferred();

            this.loginState.promise().then(function () {
                base.loginRequested = true;
            });

            this.canvas = null;
            this.poemImageSrc = ko.observable('');
            this.uploadPercent = ko.observable(0);
        }

        PublishImage.prototype.login = function () {
            var base = this;

            if (base.logRequested) return base.loginState.promise();

            FB.login(function (response) {
                if (response.status == 'connected') {
                    auth = response.authResponse;
                    facebook.utils.getUserInfo().then(function () {
                        base.loginState.resolve();
                    });
                } else {
                    base.loginState.reject();
                    base.loginState = $.Deferred();
                }
            }, { scope: permissions.uploadImages });

            return base.loginState.promise();
        }

        PublishImage.prototype.publishImageUI = function (canvas) {
            var base = this;

            base.canvas = canvas;
            base.poemImageSrc(Canvas.toDataURL(canvas));

            app.loading(true);

            return $.Deferred(function (dfd) {
                base.loginState.then(function () {
                    app.dialog.show("panel", { module: 'api/ui/facebook.poem', fixed: true }, {
                        compositionComplete: function () {
                            $('input[autofocus]').focus();
                            app.loading(false);
                        }
                    });
                }, function () {
                    app.loading(false);
                });
            })
        }

        PublishImage.prototype.publishImage = function (message) {
            var base = this;

            base.uploadPercent(0);

            var fd = new FormData();
            fd.append("access_token", auth.accessToken);
            fd.append("source", Canvas.toBlob(this.canvas));
            fd.append("message", message || "");

            return $.ajax({
                url: "https://graph.facebook.com/me/photos?access_token=" + auth.accessToken,
                data: fd,
                type: "POST",
                cache: false,
                processData: false,
                contentType: false,
                success: function (data) {
                    //console.log("success " + data);
                },
                error: function (shr, status, data) {
                    //console.log("error " + data + " Status " + shr.status);
                },
                xhr: function () {
                    var xhr = new window.XMLHttpRequest();
                    xhr.upload.addEventListener("progress", function (evt) {
                        if (evt.lengthComputable) {
                            var percentComplete = evt.loaded / evt.total;
                            base.uploadPercent(percentComplete);
                        }
                    }, false);
                    return xhr;
                },
            }).then(function () {
                app.dialog.show("alert", { content: "Your poem is published to your facebook now!" });
                app.Sound.play(app.Sound.sounds.action.success);
            }).promise();
        }

        return new PublishImage();
    })();


    return facebook;
});