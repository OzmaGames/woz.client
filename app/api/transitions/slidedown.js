define(['durandal/system', 'durandal/composition', 'jquery'], function (system, composition, $) {
    var fadeOutDuration = 100;

    var startValues = {
        top: '-100px',
        opacity: 0,
        display: 'block'
    };
    var midValues = {
        top: '20px',
        opacity: .9
    };
    var endValues = {
        top: 0,
        opacity: 1
    };
    var clearValues = {
        top: '',
        opacity: '',
        display: ''
    };

    var entrance = function (context) {
        return system.defer(function (dfd) {
            function endTransition() {
                dfd.resolve();
            }

            function scrollIfNeeded() {
                if (!context.keepScrollPosition) {
                    $(document).scrollTop(0);
                }
            }

            if (!context.child) {
                $(context.activeView).fadeOut(fadeOutDuration, endTransition);
            } else {
                var duration = context.duration || 500;

                function startTransition() {
                    scrollIfNeeded();
                    context.triggerAttach();
                    
                    var $child = (context.el ? $(context.el, context.child) : $(context.child));
                    
                    $child.css(startValues);
                    $child.animate(midValues, duration, 'swing', function () {
                        $child.animate(endValues, duration / 2, 'swing', function () {
                            $child.css(clearValues);
                            endTransition();
                        });
                    });

                    if (context.el)
                    {
                        $(context.child).fadeIn(duration);
                    }
                }

                if (context.activeView) {
                    $(context.activeView).fadeOut(fadeOutDuration, startTransition);
                } else {
                    startTransition();
                }
            }
        }).promise();
    };

    return entrance;
});