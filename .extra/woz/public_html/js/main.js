(function () {

    document.querySelector('.front button').onclick = function () {
        document.querySelector('.tile').classList.add('active');

        var input = document.querySelector('input');
        if (input && input.focus) {
            document.querySelector('input').focus();
        }
    }

})();


