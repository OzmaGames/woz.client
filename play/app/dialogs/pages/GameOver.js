define(['durandal/app'], function (app) {

    function Gameover(data) {
        this.heading = data.heading;

        var opponent = ctx.players().length > 1?
          ctx.players().filter(function(player) {
            return ctx.player.username !== player.username;
          })[0] : null;

        var opponentName = opponent? opponent.username: '';
        var opponentScore = opponent? opponent.score(): 0;

        this.content = data.content
          .replace('{{scored}}', '<span class="score">' + ctx.player.score() + '</span>')
          .replace('{{collaborativeScored}}', '<span class="score">' + (ctx.player.score() + opponentScore) + '</span>')
          .replace('{{opponent}}', '<span class="bold">' + opponentName + '</span>')
          .replace('{{opponentScored}}', '<span class="score">' + opponentScore + '</span>');
        this.btnText = data.btnText;
        this.xp = data.xp || 0;
        this.noXP = data.noXP === undefined ? false : data.noXP;
        this.target = data.target;
        this.noRedirect = data.noRedirect;

        this.btnSizeAuto = !!data.btnSizeAuto;
        this.showButtons = !data.hideButtons;
        this.stats = data.stats;

        var base = this;
        this.gotoLobby = function () {
            base.close(function () {
                if (base.target) {
                    app.navigate(base.target);
                }
            });
        }

        this.showPoem = function () {
            base.close(function () {
                app.dialog.showPoem().then(function () {
                    app.dialog.show("menu");
                });
            });
        }
    }

    var messages = {
        WON: {
            heading: "Your poem is complete!",
            content: "Your collaborative score was {{collaborativeScored}} <br> You got {{scored}} points and {{opponent}} got {{opponentScored}} points!",
            btnText: "OK!",
            stats: 'won'
        },
        LOST: {
            heading: "Your poem is complete!",
            content: "Your collaborative score was {{collaborativeScored}} <br> You got {{scored}} points and {{opponent}} got {{opponentScored}} points!",
            btnText: "OK!",
            stats: 'lost'
        },
        SOLO: {
            heading: "Well done!",
            content: "You completed the game board, scoring {{scored}} points.",
            btnText: "Start New Game",
            target: 'singlePlayer',
            stats: 'won'
        },
        RESIGNED: {
            heading: "The game has ended!",
            content: "Your co-player has resigned from the game. Too bad, but this means you win!",
            btnText: "OK!",
            target: 'lobby',
            btnSizeAuto: true,
            hideButtons: true,
            stats: 'resigned'
        }
    }

    Gameover.WON = function () { return new Gameover(messages.WON); }
    Gameover.LOST = function () { return new Gameover(messages.LOST); }
    Gameover.SOLO = function () { return new Gameover(messages.SOLO); }
    Gameover.RESIGNED = function () { return new Gameover(messages.RESIGNED); }

    return Gameover;
});