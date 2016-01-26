define(['durandal/app'], function (app) {

    function Gameover(data) {
        this.heading = data.heading;
        this.content = data.content.replace('{{scored}}', '<span class="score">' + ctx.player.score() + '</span>');
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
            heading: "Congratulations!",
            content: "You won the game, scoring {{scored}} points.",
            btnText: "Great!",
            stats: 'won'
        },
        LOST: {
            heading: "Good luck next time!",
            content: "You lost the game, scoring {{scored}} points.",
            btnText: "Dismiss!",
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
            content: "Your opponent has resigned from the game. Too bad, but this means you win!",
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