import {Component, Property, CollisionEventType} from '@wonderlandengine/api';
import {CursorTarget, HowlerAudioSource} from '@wonderlandengine/components';
import {vec3} from 'gl-matrix';

/**
 * mole
 */
export class Mole extends Component {
    static TypeName = 'mole';
    static Properties = {
        player: Property.object(),
        positionA: Property.vector3(),
        positionB: Property.vector3(),
        minTime: Property.float(1.0),
        maxTime: Property.float(5.0),
    };

    start() {
        /* Initialize */
        this.currentPosition = vec3.create();
        this.scheduleNextMove(); //Trigger mole movements
        this.skipNextMove = false;

        /* Lerp */
        this.lerpTime = 0;
        this.speedSeconds = 10.0;
        this.isMovingUp = true; //Gets toggled

        /* Physx Collision */
        this.object.getComponent('physx').onCollision((type, other) => {
            /* onCollision Start */
            if (type == CollisionEventType.Touch) {
                this.onCollision(other);
            }
        });

        /* Add CursorTarget for NonVR */
        this.target =
            this.object.getComponent(CursorTarget) ||
            this.object.addComponent(CursorTarget);

        /* SFX */
        this.popupSFX = this.object.addComponent(HowlerAudioSource, {
            src: 'sfx/PopupSFX.mp3',
            spatial: true,
        });
        this.hitSFX = this.object.addComponent(HowlerAudioSource, {
            src: 'sfx/HitSFX.mp3',
            spatial: true,
        });
    }

    update(dt) {
        /* return if game is not running */
        if (!this.player.getComponent('game-status').gameIsRunning) return;

        /* Store Position */
        this.object.getPositionWorld(this.currentPosition);

        /* Lerp Move Mole */
        this.lerpTime += dt;
        this.lerpRatio = this.lerpTime / this.speedSeconds; /* Seconds */
        if (this.lerpTime < this.speedSeconds) {
            if (this.isMovingUp) {
                /* Move Up */
                this.lerpResult = vec3.lerp(
                    vec3.create(),
                    this.currentPosition,
                    this.positionB,
                    this.lerpRatio
                );
            } else {
                /* Move Down */
                this.lerpResult = vec3.lerp(
                    vec3.create(),
                    this.currentPosition,
                    this.positionA,
                    this.lerpRatio
                );
            }
            this.object.setPositionWorld(this.lerpResult);
        }
    }

    scheduleNextMove() {
        /* Random Delay */
        this.randomDelay = Math.random() * (this.maxTime - this.minTime) + this.minTime;

        /* Schedule next move, when delay is reached */
        setTimeout(() => {
            if (!this.player.getComponent('game-status').gameIsRunning) {
                this.scheduleNextMove(); // Loop
            } else if (!this.skipNextMove) {
                /* Changing direction */
                this.isMovingUp = !this.isMovingUp; // Toggle direction
                this.lerpTime = 0; // Reset lerp time for the next movement
                this.scheduleNextMove(); // Loop
                /* SFX */
                if (this.isMovingUp && !this.gameIsRunning) {
                    this.popupSFX.play();
                }
            }
        }, this.randomDelay * 1000);
    }

    onCollision(other) {
        /* return if game is not running */
        if (!this.player.getComponent('game-status').gameIsRunning) return;

        /* On Hit */
        if (this.isMovingUp) {
            /* SFX */
            this.hitSFX.play();

            /* Animation onHit */
            this.object.getComponent('animation').play();

            /* Update Score */
            this.player.getComponent('game-status').increaseScore();

            /* Start Float Score */
            this.object.getComponent('float-score').startFloatScore();

            /* Set State */
            this.isMovingUp = false;
            this.lerpTime = 0;
            this.skipNextMove = true; //To give mole time to go back to position A

            /* Re-enable & Schedule next move */
            setTimeout(() => {
                this.skipNextMove = false;
                this.scheduleNextMove();
            }, 2000);
        }
    }

    /* Cursor Handling for NonVR */
    onActivate() {
        this.target.onDown.add(this.onDown);
    }

    onDeactivate() {
        this.target.onDown.remove(this.onDown);
    }

    onDown = (_, cursor) => {
        this.onCollision();
    };
}
