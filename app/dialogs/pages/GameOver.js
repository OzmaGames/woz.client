define(['durandal/app'], function (app) {

   function Gameover(data) {
      this.heading = data.heading;
      this.content = data.content;
      this.btnText = data.btnText;
      this.experience = 0;

      this.gotoLobby = function () {
         //app.dialog.close("notice");
         if (data.target) {
            app.navigate(data.target);
         } else {
            app.navigate("lobby");
         }
      }
   }

   var messages = {
      WON: {
         heading: "Congratulations!",
         content: "You won the game.",
         btnText: "back to lobby"
      },
      LOST: {
         heading: "Good luck next time!",
         content: "You lost the game.",
         btnText: "back to lobby"
      },
      SOLO: {
         heading: "Well done!",
         content: "You completed the game board.",
         btnText: "continue playing",
         target: 'singlePlayer'
      },
      RESIGNED: {
         heading: "Meh, Good luck next time!",
         content: "You resigned the game.",
         btnText: "back to lobby"
      }
   }

   Gameover.WON = new Gameover(messages.WON);
   Gameover.LOST = new Gameover(messages.LOST);
   Gameover.SOLO = new Gameover(messages.SOLO);
   Gameover.RESIGNED = new Gameover(messages.RESIGNED);

   return Gameover;
});