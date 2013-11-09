define(function () {

  var vm = {
    bigImageURL: function (collection, imageName) {
      return 'images/tiles/' + collection + '/' + imageName + '.jpg';
    },    
    salt: "!XXX.666.ozma,is,awesome.666.XXX!"
  };
  
  return vm;

});