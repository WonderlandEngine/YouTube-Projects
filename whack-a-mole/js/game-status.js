import {Component, Property} from '@wonderlandengine/api';

/**
 * game-status
 * This component handles: timer, score, gameover panel visibility, game status (gameIsRunning)
 */
export class GameStatus extends Component {
    static TypeName = 'game-status';
    /* Properties that are configurable in the editor */
    static Properties = {
        timerText: Property.object(),
        scoreText: Property.object(),
        highestScoreText: Property.object(),
        gameTimer: Property.float(60.0),
        gameoverPanel: Property.object(),
    };

    start() {
        /* Initialize */
        this.gameIsRunning = false;
        this.score = 0;
        this.highestScore = 0;
        this.timer = this.gameTimer;
    }

    /* Call to Start or Restart the game */
    startGame() {
        /* Start Game */
        this.gameIsRunning = true;

        /* Reset Score */
        this.score = 0;
        this.scoreText.getComponent('text').text = 'Score: ' + this.score;

        /* Reset Timer */
        this.timer = this.gameTimer;
        this.timerText.getComponent('text').text = 'Timer: ' + this.timer;

        /* Hide Gameover Panel */
        this.gameoverPanelDefaultScale = this.gameoverPanel.getScalingWorld();
        this.setGameoverPanelVisibility(false);
    }

    /* What to do when game is over */
    gameOver() {
        /* Update Game Status */
        this.gameIsRunning = false;

        /* Unhide Gameover Panel */
        this.setGameoverPanelVisibility(true);
    }

    update(dt) {
        /* Start Timer, minus 1 each second */
        if (this.gameIsRunning) {
            /* Update Timer */
            this.timer -= dt;

            /* Ensure the timer doesn't go below 0 */
            if (this.timer < 0) {
                this.timer = 0;
            }

            /* Update Timer Text */
            const roundedTimer = Math.floor(this.timer); // Round down to the nearest whole number
            this.timerText.getComponent('text').text = 'Timer: ' + roundedTimer;

            /* if timer reached 0, stop game */
            if (this.timer <= 0) {
                /* Stop Game */
                this.gameOver();
            }
        }
    }

    increaseScore() {
        /* Update Score */
        this.score += 1;
        this.scoreText.getComponent('text').text = 'Score: ' + this.score;

        /* Update Highest Score */
        if (this.score > this.highestScore) {
            this.highestScore = this.score;
            this.highestScoreText.getComponent('text').text =
                'Top Score: ' + this.highestScore;
        }
    }

    setGameoverPanelVisibility(isVisible) {
        /* Set scaling based on whether we want to show or hide the panel */
        this.gameoverPanel.setScalingWorld(
            isVisible ? this.gameoverPanelDefaultScale : [0, 0, 0]
        );

        /* Get the child named "Button" and adjust its collision based on the panel visibility */
        const panelButton = this.gameoverPanel.children.find(
            (child) => child.name === 'Button'
        );
        if (panelButton) {
            panelButton.getComponent('collision').active = isVisible;
        }
    }
}
