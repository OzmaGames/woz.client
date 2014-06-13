define( 'sounds/manifest', [], function () {
   return {
      click: {
         command: [
            //'General menu click/General_menu_click-01.ogg'
         ],
         action: [
            'Activity menu click/Activity_menu_click-01.ogg'
         ],
         button: [
         	'Click button/click_button-01.ogg'
         ]
      },
      notification: [
         'Getting a notification/Getting_a_notification-01.wav'
      ],
      dialog: {
         closing: [
            'Closing a dialogue/Closing_a_dialogue-03.ogg',
            'Closing a dialogue/Closing_a_dialogue-04.ogg'

         ],
         notice: [
            'When a paper dialogue shows/When_a_paper_dialogue_shows-02.ogg'
         ],
         help: [
            'Dialog Help Open/dialog_help_Open-01.ogg'
         ],
         helpClosing: [
         	'Dialog help Closing/dialog_help_Closing-01.ogg'
         ],
         menu: [
         	'Dialog Menu/Dialog_Menu-01.ogg'

         ],
         confirm: [
         	'Confirm Dialog/Confirm_dialog-01.ogg'

         ],
         confirmClosing: [
         	'Confirm Dialog Closing/confirm_dialog_closing-01.ogg'
         ],
         slipper: [
            'Drop down dialogue/Drop_down_dialogue-01.ogg'
         ],
         login: [
            'Login dialogue/Login_dialogue-01.ogg'  
         ]
      },
      action: {
         success: [
            'Action success/Action_success-01.wav'
         ],
         fail: [
            'Action fail/Action_fail-01.wav'
         ],
         //function fails - like when there are no versions.
         functionFailed: [

         ]
      },
      game: {
         loading: [
            'Loading a game/Loading_a_game-01.ogg',
            'Loading a game/Loading_a_game-02.ogg',
            'Loading a game/Loading_a_game-03.ogg'
         ],
         unfolding: [
            'Unfolding game board/Unfolding_game_board-01.ogg',
            'Unfolding game board/Unfolding_game_board-02.ogg'
         ],
         overWin: [
            'Game over win/Game_over_win-01.ogg'

         ],
         overLose: [
            'Game over lose/Game_over_lose-01.wav'
         ],
         overResigned: [
            'Game over the other player resigned/Game_over_the_other_player_resigned-01.wav'
         ],
         del: [
            'Delete Game/Delete_game-01.wav',
            'Delete Game/Delete_game-02.wav'
         ]
      },
      enlargeTile: [
         'Enlarge picture tiles/Enlarge_picture_tiles-01.ogg',
         'Enlarge picture tiles/Enlarge_picture_tiles-02.ogg',
         'Enlarge picture tiles/Enlarge_picture_tiles-03.ogg',
         'Enlarge picture tiles/Enlarge_picture_tiles-04.ogg',

      ],
      shrinkTile: [
      		'Shrink picture tiles/Shrink_picture_tiles-01.ogg',
      		'Shrink picture tiles/Shrink_picture_tiles-02.ogg'
      
      ],
      word: {
         lift: [
            'Lift word/Lift_word-01.ogg',
            'Lift word/Lift_word-02.ogg',
            'Lift word/Lift_word-03.ogg',
            'Lift word/Lift_word-04.ogg'
         ],
         place: [
            'Place word on game board/Place_word_on_game_board-01.wav',
            'Place word on game board/Place_word_on_game_board-02.wav',
            'Place word on game board/Place_word_on_game_board-03.wav',
            'Place word on game board/Place_word_on_game_board-04.wav',
            'Place word on game board/Place_word_on_game_board-05.wav'
         ],
         placeBack: [
            'Place word back on workspace/Place_word_back_on_workspace-01.wav',
            'Place word back on workspace/Place_word_back_on_workspace-02.wav',
            'Place word back on workspace/Place_word_back_on_workspace-03.wav',
            'Place word back on workspace/Place_word_back_on_workspace-04.wav',
            'Place word back on workspace/Place_word_back_on_workspace-05.wav',
            'Place word back on workspace/Place_word_back_on_workspace-06.wav'
         ],
         select: [
         	'Word Select/word_select-01.ogg'
         ],
         show: [
            'New words appearing-01/New_words_appearing-01.ogg',
            'New words appearing-01/New_words_appearing-02.ogg',
            'New words appearing-01/New_words_appearing-03.ogg',
            'New words appearing-01/New_words_appearing-04.ogg',
            'New words appearing-01/New_words_appearing-05.ogg',
            'New words appearing-01/New_words_appearing-06.ogg'
         ],
         wiggling: [

         ]
      },
      scoring: {
         word: [
            'Scoring for words/Scoring_for_words-01.ogg'
         ],
         bonus: [
            'Scoring bonus normal/Scoring_bonus_normal-01.ogg'
         ],
         bonusMult: [
            'Scoring bonus multiplyer/Scoring_bonus_multiplyer-01.ogg'
         ],
         message: [
            'score_result_message/score_result_message-01.ogg'
         ]
      },
      selectTool: [
         'Using the select tool/Using_the_select_tool-01.ogg',
         'Using the select tool/Using_the_select_tool-02.ogg',
         'Using the select tool/Using_the_select_tool-03.ogg',
         'Using the select tool/Using_the_select_tool-04.ogg',
         'Using the select tool/Using_the_select_tool-05.ogg',
         'Using the select tool/Using_the_select_tool-06.ogg',
         'Using the select tool/Using_the_select_tool-07.ogg',
         'Using the select tool/Using_the_select_tool-08.ogg',
         'Using the select tool/Using_the_select_tool-09.ogg'
      ],
      phraseCompleted: [
         'Sentence completed/Sentence_completed-01.ogg'
      ],
      lobbyLoading: [

      ],
      //loading new screen (same for all screens accept game screen)
      pageTransition: [
      	//'pageTransition/page_Transition-02.ogg'
      	 'Enlarge picture tiles/Enlarge_picture_tiles-05.ogg',
         'Enlarge picture tiles/Enlarge_picture_tiles-06.ogg',
         'Enlarge picture tiles/Enlarge_picture_tiles-07.ogg',
         'Enlarge picture tiles/Enlarge_picture_tiles-08.ogg'
      ]
   };
} )