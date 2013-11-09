define(function () {
  return {
    
    YOUR_TURN_FIRST_ROUND: {
      heading: "IT'S YOUR TURN!",
      content: "Place a phrase on the game board to score. Use action buttons to the left."
    },

    YOUR_TURN: {
      heading: "IT'S YOUR TURN!",
      content: "Place a phrase on the game board to score. Use action buttons to the left."
    },

    THEIR_TURN: {
      heading: "IT'S YOUR OPPONENT'S TURN!",
      content: "Work on your masterpiece while you wait for your opponent to place a phrase."
    },

    CIRCLE_WORDS: {
      heading: "Select a Phrase!",
      content: "Place a whole phrase on the game board, by circling it and then choose a path to place it."
    },    

    SWAP_WORDS: {
      heading: "SWAP WORDS",
      content: "Select the words you like to swap to exchange them for new ones. Then click \"Done\""
    },

    GAME_OVER_YOU_WON: {
      heading: "Congratulations!",
      content: "You won the game.",
      buttonText: "back to lobby",
      showXP: true 
    },
    GAME_OVER_YOU_LOST: {
      heading: "Good luck next time!",
      content: "You lost the game.",
      buttonText: "back to lobby",
      showXP: true
    },
    GAME_OVER_SOLO: {
      heading: "Well done!",
      content: "You completed the game board.",
      buttonText: "continue playing",
      showXP: true
    },
    GAME_OVER_YOU_RESIGNED:{
      heading: "Meh, Good luck next time!",
      content: "You resigned the game.",
      buttonText: "back to lobby",
      showXP: true
    },


    ACTIONS: {

      title: "actions",

      heading: "It's your turn, select an action!",

      options: [

        {
          name: "Swap words",
          imageURLs: {
            unselected: "images/app/dialogs/actions/option-swap-words.png",
            selected: "images/app/dialogs/actions/option-swap-words-selected.png"
          },
          description: "",
        },

        {
          name: "Place tile",
          imageURLs: {
            unselected: "images/app/dialogs/actions/option-place-tile.png",
            selected: "images/app/dialogs/actions/option-place-tiles-selected.png"
          },
          description: "",
        },

        {
          name: "Swap tile",
          imageURLs: {
            unselected: "images/app/dialogs/actions/option-swap-tile.png",
            selected: "images/app/dialogs/actions/option-swap-tile-unselected.png"
          },
          description: "",
        },

        {
          name: "Sneak peek",
          imageURLs: {
            unselected: "images/app/dialogs/actions/option-sneak-peek.png",
            selected: "images/app/dialogs/actions/option-skeak-peek-selected.png"
          },
          description: "",
        },

        {
          name: "No action",
          imageURLs: {
            unselected: "images/app/dialogs/actions/option-no-action.png",
            selected: "images/app/dialogs/actions/option-no-action.png"
          },
          description: "",
        },

      ],

      buttons: [
        {
          name: "Choose"
        }
      ]

    }
  }
});