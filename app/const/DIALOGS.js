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

    YOUR_TURN_FIRST_ROUND: {
      heading: "IT'S YOUR TURN!",
      content: "To score you need to place a phrase, but first you can use the buttons on the left to choose one out of 3 actions: Swap words, Place tile and Swap tile. Use checkmark to skip turn."
    },

    YOUR_TURN: {
      heading: "IT'S YOUR TURN!",
      content: "Place a phrase, or use the buttons on the left to select an action. If you don't want to do anything, you can end your turn with the check mark button."
    },

    THEIR_TURN: {
      heading: "IT'S YOUR OPPONENT'S TURN!",
      content: "Work on your masterpiece while you wait for your opponent to place a phrase."
    },

    YOUR_TURN_SELECT_MAGNETS: {
      heading: "IT'S YOUR TURN! - Select a phrase!",
      content: "Drag and drop words to make a phrase. A phrase must have 3 – 9 words. Select a phrase by circling it. Make sure the phrase is following the rules of the two tiles you wish to connect."
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

    SWAP_TILE: {
      heading: "SWAP TILE",
      content: "You can only swap unlinked picture tiles. Circle the tile you like to swap to exchange it for a new one."
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