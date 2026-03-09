import {Component, Property} from '@wonderlandengine/api';
import {HowlerAudioSource} from '@wonderlandengine/components';

/**
 * player
 */
export class Player extends Component {
    static TypeName = 'player';
    /* Properties that are configurable in the editor */
    static Properties = {
        scoreText: Property.object(),
        timerText: Property.object(),
        endPanel: Property.object(),
        endPanelScoreText: Property.object(),
        x1: Property.object(),
        x2: Property.object(),
        x3: Property.object(),
        xEmptyMat: Property.material(),
        xFullMat: Property.material(),
    };

    start() {
        /* General */
        this.isGameOver = false;

        /* SFX */
        this.timeUp = this.object.addComponent(HowlerAudioSource, {
            src: 'sfx/Time-Up.wav',
            spatial: true,
        });

        /* Score */
        this.score = 0;
        this.scoreText.getComponent('text').text = this.score;

        /* Bomb */
        this.bombHits = 0;
        this.x1.getComponent('text').material = this.xEmptyMat;
        this.x2.getComponent('text').material = this.xEmptyMat;
        this.x3.getComponent('text').material = this.xEmptyMat;

        /* Timer */
        this.timer = 60; //60 seconds
        this.timerCountDown(); //Decrease timer each second

        /* Hide endPanel */
        this.endPanel.translateObject([0, -50, -50]);
    }

    timerCountDown() {
        /* Stop timer if game is over */
        if (this.isGameOver) return;

        /* Time is up? */
        if (this.timer <= 0) {
            /* Time up */
            this.timeUp.play();
            this.gameOver();
        } else {
            /* Decrease timer each second */
            this.timer--;
            this.timerText.getComponent('text').text = this.timer;

            /* Schedule the next random call */
            setTimeout(() => {
                this.timerCountDown();
            }, 1000);
        }
    }

    increaseScore() {
        this.score++;
        this.scoreText.getComponent('text').text = this.score;
    }

    bombHit() {
        if (this.isGameOver) return;

        /* Increase bombHits */
        this.bombHits++;

        /* Show X based on bombHits */
        if (this.bombHits > 0) {
            this.x1.getComponent('text').material = this.xFullMat;
        }
        if (this.bombHits > 1) {
            this.x2.getComponent('text').material = this.xFullMat;
        }
        if (this.bombHits > 2) {
            this.x3.getComponent('text').material = this.xFullMat;
            this.gameOver();
        }
    }

    gameOver() {
        /* GameOver */
        this.isGameOver = true;

        /* Show endPanel */
        this.endPanel.translateObject([0, 50, 50]);

        /* Show score */
        this.endPanelScoreText.getComponent('text').text = `Score: ${this.score}`;
    }

    reset() {
        /* Reset */
        this.start();
        this.scoreText.getComponent('text').text = this.score;
        this.x1.getComponent('text').material = this.xEmptyMat;
        this.x2.getComponent('text').material = this.xEmptyMat;
        this.x3.getComponent('text').material = this.xEmptyMat;
    }
}
