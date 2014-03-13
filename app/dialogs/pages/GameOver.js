define(['durandal/app'], function (app) {

   function Gameover(data) {
      this.heading = data.heading;
      this.content = data.content;
      this.btnText = data.btnText;
      this.xp = data.xp || 0;
      this.target = data.target || "lobby";
      this.noRedirect = data.noRedirect;

      var base = this;
      this.gotoLobby = function () {
         app.dialog.close("notice");
         if (!base.noRedirect) {
            app.navigate(base.target);
         }
      }
   }

   var messages = {
      WON: {
         heading: "Congratulations!",
         content: "You won the game.",
         btnText: "Great!"
      },
      LOST: {
         heading: "Good luck next time!",
         content: "You lost the game.",
         btnText: "Dismiss!"
      },
      SOLO: {
         heading: "Well done!",
         content: "You completed the game board.",
         btnText: "Start New Game",
         target: 'singlePlayer'
      },
      RESIGNED: {
         heading: "Meh, Good luck next time!",
         content: "You resigned the game.",
         btnText: "Dismiss"
      }
   }

   Gameover.WON = new Gameover(messages.WON);
   Gameover.LOST = new Gameover(messages.LOST);
   Gameover.SOLO = new Gameover(messages.SOLO);
   Gameover.RESIGNED = new Gameover(messages.RESIGNED);

   return Gameover;
});