define(function () {

   var vm = {
      bigImageURL: function (collection, imageName) {
         return 'images/tiles/' + collection + '/' + imageName + '.jpg';
      },
      salt: "!XXX.666.ozma,is,awesome.666.XXX!",
      tutorialGames: [
         {
            title: 'Place a phrase.',
            description: 'Drag and drop the words on the path. <br />When the whole path is filled, the phrase will be accepted.',
            tiles: [
               { id: 0, imageID: 19, x: .25, y: .75 },
               { id: 1, imageID: 14, x: .75, y: .75 }
            ],
            paths: [
               { id: 0, nWords: 3, cw: 1, startTile: 0, endTile: 1 }
            ],
            words: [
               { id: 0, x: 0.50, y: 0.00, lemma: 'I' },
               { id: 1, x: 0.40, y: 0.07, lemma: 'love' },
               { id: 2, x: 0.60, y: 0.15, lemma: 'hate' },
               { id: 3, x: 0.25, y: 0.05, lemma: 'you' },
               { id: 4, x: 0.66, y: 0.05, lemma: 'candy' },
            ]
         }, {
            title: 'Use a related word in a phrase.',
            description: 'The words marked with a <b>yellow</b> border score extra points, <br/> if put anywhere on a path connected to a picture that fits the word.',
            tiles: [
               { id: 0, imageID: 19, x: .25, y: .75 },
               { id: 1, imageID: 14, x: .75, y: .75 }
            ],
            paths: [
               { id: 0, nWords: 4, cw: 1, startTile: 0, endTile: 1 }
            ],
            words: [
               { id: 0, x: 0.50, y: 0.00, lemma: 'I' },
               { id: 1, x: 0.40, y: 0.07, lemma: 'fell' },
               { id: 2, x: 0.60, y: 0.15, lemma: 'asleep' },
               { id: 3, x: 0.25, y: 0.05, lemma: 'you' },
               { id: 4, x: 0.20, y: 0.10, lemma: 'the' },
               { id: 5, x: 0.75, y: 0.10, lemma: 'want' },
               { id: 6, x: 0.66, y: 0.05, lemma: 'moon', isRelated: true }
            ]
         }, {
            title: 'Get a bonus.',
            description: 'Place a phrase that includes one or more words that <b>fit the bonus criteria</b>. <br> <small>(Get a longer description of the criteria by clicking or tapping on the question mark.)</small>',
            tiles: [
               { id: 0, imageID: 19, x: .25, y: .75, instruction: 'feeling', bonus: 20, angle: -30, description: '' },
               { id: 1, imageID: 14, x: .75, y: .75 }
            ],
            paths: [
               { id: 0, nWords: 3, cw: 1, startTile: 0, endTile: 1 }
            ],
            words: [
               { id: 0, x: 0.50, y: 0.00, lemma: 'I' },
               { id: 1, x: 0.40, y: 0.07, lemma: 'love' },
               { id: 2, x: 0.60, y: 0.15, lemma: 'ate' },
               { id: 3, x: 0.25, y: 0.05, lemma: 'you' },
               { id: 4, x: 0.66, y: 0.05, lemma: 'candy' },
            ]
         }, {
            title: 'Get all bonuses.',
            description: 'With one phrase you can fulfill two bonuses.',
            tiles: [
               { id: 0, imageID: 19, x: .15, y: .60, instruction: 'feeling', bonus: 20, angle: 160, description: '' },
               { id: 1, imageID: 14, x: .50, y: .80, instruction: 'First letter: S', mult: 2, angle: 40, description: '' },
               { id: 2, imageID: 08, x: .85, y: .60, instruction: 'Verb', bonus: 20, angle: 140, description: '' },
            ],
            paths: [
               { id: 0, nWords: 3, cw: 1, startTile: 0, endTile: 1 },
               { id: 1, nWords: 3, cw: 0, startTile: 1, endTile: 2 }
            ],
            words: [
               { id: 0, x: 0.50, y: 0.00, lemma: 'I' },
               { id: 1, x: 0.40, y: 0.07, lemma: 'love' },
               { id: 2, x: 0.60, y: 0.15, lemma: 'want' },
               { id: 3, x: 0.25, y: 0.05, lemma: 'you' },
               { id: 4, x: 0.66, y: 0.05, lemma: 'snow' },
               { id: 5, x: 0.75, y: 0.10, lemma: 'sunshine' },
            ]
         }, {
            title: 'Place a phrase with the select tool.',
            description: 'To place a whole phrase on the game board in one go, <br /> you can line up the words below and use the <b>select tool</b> in the left menu.',
            tiles: [
               { id: 0, imageID: 19, x: .25, y: .75 },
               { id: 1, imageID: 14, x: .75, y: .75 }
            ],
            paths: [
               { id: 0, nWords: 3, cw: 1, startTile: 0, endTile: 1 },
            ],
            words: [
               { id: 0, x: 0.50, y: 0.00, lemma: 'I' },
               { id: 1, x: 0.40, y: 0.07, lemma: 'love' },
               { id: 2, x: 0.60, y: 0.15, lemma: 'hate' },
               { id: 3, x: 0.25, y: 0.05, lemma: 'you' },
               { id: 4, x: 0.66, y: 0.05, lemma: 'cats' }
            ],
            allowCircle: true
         }, {
            title: 'Explore the action menu.',
            description: 'During your turn you have the possibility to: <br> <b>Swap words</b>, <b>Add a word</b> and <b>change word endings</b>. <br/> Try at least one action and place a phrase.',
            tiles: [
               { id: 0, imageID: 19, x: .25, y: .75 },
               { id: 1, imageID: 14, x: .75, y: .75 }
            ],
            paths: [
               { id: 0, nWords: 3, cw: 1, startTile: 0, endTile: 1 },
            ],
            words: [
               { id: 0, x: 0.50, y: 0.00, lemma: 'I' },
               { id: 1, x: 0.40, y: 0.07, lemma: 'love' },
               { id: 2, x: 0.60, y: 0.15, lemma: 'hate' },
               { id: 3, x: 0.25, y: 0.05, lemma: 'you' },
               { id: 4, x: 0.66, y: 0.05, lemma: 'birds' }
            ],
            allowCircle: true,
            tickets: {
               swapWords: 1,
               versions: 1,
               addWords: 1
            }
         }
      ]
   };

   var index = 1, len = vm.tutorialGames.length;
   ko.utils.arrayForEach(vm.tutorialGames, function (game) {
      ko.utils.arrayForEach(game.tiles, function (tile) {
         tile.angle = tile.angle || 0;
         tile.bonus = tile.bonus || 0;
         tile.description = tile.description || "";
         tile.imageName = "";
         tile.instruction = tile.instruction || "";
         tile.mult = tile.mult || 0;
      });
      ko.utils.arrayForEach(game.paths, function (path) {

      });
      ko.utils.arrayForEach(game.words, function (word) {
         word.angle = Math.random() * 5 - 2.5;
         word.isRelated = !!word.isRelated;
         word.points = 0;
      });

      game.players = [{ username: 'ali', score: 0, active: true }];
      game.playerCount = 1;
      game.over = false;
      game.collection = { shortName: "woz", longName: "Words Of Oz" };
      game.actionDone = true;
      game.tickets = game.tickets || {};
      game.tickets = {
         swapWords: game.tickets.swapWords || 0,
         versions: game.tickets.versions || 0,
         addWords: game.tickets.addWords || 0,
      },
      game.allowCircle = !!game.allowCircle;
      game.id = 't' + (index - 1);
      game.title = index + '. ' + game.title;
      game.page = index + '/' + len;

      index++;
   });


   return vm;

});