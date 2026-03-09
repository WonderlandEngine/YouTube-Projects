import {Component, Property} from '@wonderlandengine/api';

/**
 * scarecrow
 * Handles the scarecrow logic.
 */
export class Scarecrow extends Component {
    static TypeName = 'scarecrow';
    /* Properties that are configurable in the editor */
    static Properties = {
        scarecrowMesh: Property.object(), // The mesh that we want to animate when the scarecrow is dead
        healthObj: Property.object(), // The object that has the health component that we want to listen to (Usually self)
    };

    start() {
        /* Initialize values */
        this.isDead = false;

        /* Delay by 1 tick so health.start() runs first */
        setTimeout(() => {
            /* Register callbacks */
            this.registerCallbacks();
        }, 1);
    }

    /* Registers callbacks */
    registerCallbacks() {
        /* Get the health component from the healthObj (usually self) */
        const healthComponent = this.healthObj.getComponent('health');

        /* Register to listen to onDeath event from the health component */
        if (healthComponent && healthComponent.onDeathCallback === null) {
            healthComponent.onDeathCallback = () => {
                this.onScarecrowDeath();
            };
        }

        /* Register to listen to onHealthFullRegenerated event from the health component */
        if (healthComponent && healthComponent.onHealthFullRegeneratedCallback === null) {
            healthComponent.onHealthFullRegeneratedCallback = () => {
                this.onScarecrowRevive();
            };
        }
    }

    /* Gets called when the scarecrow is dead */
    onScarecrowDeath() {
        /* If the scarecrow is already dead, return */
        if (this.isDead) return;

        // Debug log
        console.log('Scarecrow: I died! 😥');

        /* Set isDead to true */
        this.isDead = true;

        /* Rotate locally around X-axis by 90 degrees, to simulate falling */
        this.scarecrowMesh.setRotationLocal([0, 0, 0, 1]); // Reset rotation
        this.scarecrowMesh.rotateAxisAngleDegObject([1, 0, 0], -90); // Fall backward
    }

    /* Gets called when the scarecrow is revived */
    onScarecrowRevive() {
        /* If the scarecrow is already alive, return */
        if (!this.isDead) return;

        // Debug log
        console.log('Scarecrow: I am alive again! 😊');

        /* Set isDead to false */
        this.isDead = false;

        /* Reset rotation locally */
        this.scarecrowMesh.setRotationLocal([0, 0, 0, 1]); // Reset rotation
    }
}
