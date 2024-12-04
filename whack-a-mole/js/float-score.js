import {Alignment, Component, Property} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';

export class FloatScore extends Component {
    static TypeName = 'float-score';
    static Properties = {
        playerCamera: Property.object(),
        textMaterial: Property.material(),
        textFloatDuration: Property.float(1),
        textFloatHeight: Property.float(1),
    };

    start() {
        /* Initialize */
        this.scoreLerpResult = [0, 0, 0];
        this.scoreLerpTime = 100;

        /* Create Text Object */
        this.textObject = this.engine.scene.addObject();
        this.textObject.setScalingWorld([1, 1, 1]);
        this.textObject.addComponent('text', {
            text: '+1',
            material: this.textMaterial,
            alignment: Alignment.Center,
            effect: 0,
        });
    }

    /* Call this to Start Float Score */
    startFloatScore() {
        this.scoreLerpTime = 0;
    }

    update(dt) {
        /* Start Location */
        this.textStartLoc = this.object.getPositionWorld([]);
        this.textNewLoc = [
            this.textStartLoc[0],
            this.textStartLoc[1] + this.textFloatHeight,
            this.textStartLoc[2],
        ];

        /* ScoreLerp (Move score text up over time) */
        this.scoreLerpTime += dt * 1;
        if (this.scoreLerpTime < this.textFloatDuration) {
            /* Activate Text Rendering */
            this.textObject.getComponent('text').active = true;

            /* Lerp Animate Up */
            vec3.lerp(
                this.scoreLerpResult,
                this.textStartLoc,
                this.textNewLoc,
                this.scoreLerpTime
            );
            this.textObject.setPositionWorld(this.scoreLerpResult);

            /* Rotation LookAt Player Camera */
            this.textObject.lookAt(this.playerCamera.getPositionWorld([]));
            this.textObject.rotateAxisAngleDegObject([0, 1, 0], 180); //Rotate 180 Degrees
        } else {
            /* Deactivate Text Rendering */
            this.textObject.getComponent('text').active = false;

            /* Reset to its original parent location */
            this.textObject.resetPosition();
        }
    }
}
