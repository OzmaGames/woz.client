define(function () {

    var vm = {
        images: [
            { id: 0, imageName: "barbed_wire" }, 
            { id: 1, imageName: "bear" },
            { id: 2, imageName: "black_cat" },
            { id: 3, imageName: "clock_in_sand" },
            { id: 4, imageName: "couple" },
            { id: 5, imageName: "dark_forest" },
            { id: 6, imageName: "deer_in_snow" },
            { id: 7, imageName: "fire" },
            { id: 8, imageName: "fox" },
            { id: 9, imageName: "frozen_cattai" },
            { id: 10, imageName: "girl_in_rain" },
            { id: 11, imageName: "girl_in_white_dress" },
            { id: 12, imageName: "goat" },
            { id: 13, imageName: "golden_forest" },
            { id: 14, imageName: "hands_with_soil" },
            { id: 15, imageName: "misty_forest" },
            { id: 16, imageName: "moon" },
            { id: 17, imageName: "old_house" },
            { id: 18, imageName: "old_woman" },
            { id: 19, imageName: "rail" },
            { id: 20, imageName: "statue" },
            { id: 21, imageName: "still_water" },
            { id: 22, imageName: "stream" },
            { id: 23, imageName: "tomb" },
            { id: 24, imageName: "white_flower" }
        ],
        salt: "!XXX.666.ozma,is,awesome.666.XXX!"
    };

    for (var i = 0; i < vm.images.length; i++) {
        var name = vm.images[i].imageName;
        vm.images[i].imageName = 'images/core/tiles/' + name.replace(' ', '_') + (name.indexOf('.') == -1 ? '.jpg' : '');
    }

    return vm;
    
});