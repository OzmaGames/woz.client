(function () {

   var form = document.getElementsByTagName("form")[0];
   var emailInput = document.getElementsByTagName("input")[0];

   form.onsubmit = function () {
      if (emailInput.checkValidity()) {
         var cards = document.getElementsByClassName('card');
         for (var i = 0; i < cards.length; i++) {
            cards[i].classList.add('active');
         }

         var url = form.getAttribute("action");
        
         post(url, { email: emailInput.value }, function (data) {
            var note = document.getElementsByClassName('card')[1];
            note.classList.add('loaded');

            
            var json = JSON.parse(data);
            if (!json.success) {
               var el = document.getElementById("message");
               if (json.error.code == 214) {
                  el.innerHTML = 'You are already on the list :)';
               } else {
                  el.innerHTML = json.error.error;
               }
            }
            console.log(json);
         });
      }
      return false;
   }  

   function post(url, data, func) {
      var xmlhttp = new XMLHttpRequest();

      xmlhttp.onreadystatechange = function () {
         if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {            
            func(xmlhttp.responseText);

         }
      }
      xmlhttp.open("POST", url, true);
      xmlhttp.setRequestHeader('Content-type', 'application/json');
      xmlhttp.send(JSON.stringify(data));
   }
})();


