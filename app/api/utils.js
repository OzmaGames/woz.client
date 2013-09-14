define(function () {
    return {
        find: function (arr, data) {
            for (var i = 0; i < arr.length; i++)
                if (match(arr[i], data)) return arr[i];            
        }
    }

    function match(item, data) {
        for (var key in data)
            if (item[key] != data[key]) return false;
        return true;
    }
});