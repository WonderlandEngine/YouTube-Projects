import {Component, Property, PhysXComponent} from '@wonderlandengine/api';
import {TpsMovement} from './tps-movement';

/**
 * player
 */
export class Player extends Component {
    static TypeName = 'player';
    /* Properties that are configurable in the editor */
    static Properties = {};

    start() {
        /* Store the player's initial position as start position */
        this.playerStartPosition = this.object.getPositionWorld();
    }

    /* Reset player to their start position */
    resetPlayerToStart() {
        if (this.playerStartPosition) {
            /* Disable Player Movement while Kinematic to avoid crash */
            this.object.getComponent(TpsMovement).setEnabled(false); // Disable Player Movement while Kinematic to avoid crash
            this.object.getComponent(PhysXComponent).kinematic = true; // Make physx kinematic to be able to reset its position

            /* Reset player position to start */
            this.object.setPositionWorld(this.playerStartPosition);

            /* Enable Player Movement again (after 150ms to avoid crash from the kinematic)*/
            setTimeout(() => {
                this.object.getComponent(PhysXComponent).kinematic = false; // Make physx non-kinematic to be able to move
                this.object.getComponent(TpsMovement).setEnabled(true); // Enable Player Movement again
            }, 150);

            // Log the death for debugging
            console.log('Death! Player reset to start position due to spike collision.');
        } else {
            console.warn('Player start position not stored, cannot reset');
        }
    }
}
