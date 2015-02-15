(function () {

    document.querySelector('.front button').onclick = function () {
        document.querySelector('.tile').classList.add('active');

        if (isIE()) {
            alert('We are very sorry. Internet Explorer is not supported! You can literally use any other browser to play Words of Oz. Please switch to either Chrome, Safari, Opera, Firefox or your tablet to continue playing. Have fun :)');
        }

        var input = document.querySelector('input');
        if (input && input.focus) {
            document.querySelector('input').focus();
        }
    }

    if (isIE()) { 
        loadCSS('_ie');
    }

    function loadCSS(css) {
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = 'css/' + css + '.css';
        document.getElementsByTagName("head")[0].appendChild(link);
    }

    function isIE(userAgent) {
        userAgent = userAgent || navigator.userAgent;
        return userAgent.indexOf("MSIE ") > -1 || userAgent.indexOf("Trident/") > -1;
    }
})();


