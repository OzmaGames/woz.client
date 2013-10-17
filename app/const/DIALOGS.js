define(function () {
  return {
    LOGIN_FAILURE: {
      heading: "INCORRECT LOG-IN",
      content: "Please try again."
    },

    GAME_OVER_YOU_WON: {
      heading: "GAME OVER!",
      content: "You won!"
    },

    GAME_OVER_THEY_WON: {
      heading: "GAME OVER!",
      content: "Your opponent won!"
    },

    GAME_OVER_SOLO_YOU_RESIGNED: {
      heading: "GAME OVER!",
      content: "Too bad! You resigned the game!"
    },

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

    YOUR_TURN_MAKE_PHRASE: {
      heading: "IT'S YOUR TURN! - Make a phrase!",
      content: "To score you must place a phrase between two picture tiles. Turn tiles over to find the rules the phrase must follow. Go to your workspace to make a phrase, or use checkmark to skip turn."
    },

    YOUR_TURN_PLACE_PHRASE: {
      heading: "IT'S YOUR TURN! - Place a phrase!",
      content: "To place a phrase: Draw a line on the gameboard between the two tiles you wish to connect. When you’re happy use the DONE-button to submit your phrase."
    },

    SWAP_WORDS: {
      heading: "SWAP WORDS",
      content: "Select the words you like to swap to exchange them for new ones. Then click \"Done\""
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