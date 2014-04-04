define(['durandal/app'], function (app) {

   app.on("tutorial:game:place-phrase", function (data) {
      console.log(data);
      app.dialog.show("notice", {
         model: { message: 'Now we will process your phrase.. this might take some time :)' },
         view: 'dialogs/pages/alert',
         closeOnClick: false,
         fixed: true,
         centered: true,
         modal: true
      }).then(function () {

      });
   });
  
});