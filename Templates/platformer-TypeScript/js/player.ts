import {Component, PhysXComponent, Object3D, property} from '@wonderlandengine/api';
import {TpsMovement} from './tps-movement.js';

/**
 * Player Component
 * Handles player reset functionality when touching spikes
 * Simple and beginner-friendly implementation
 */
export class Player extends Component {
    static TypeName = 'player';

    /* Properties configurable in the editor */
    @property.bool(false)
    isDebug!: boolean; // Enable debug logs?

    /* Player start position for reset functionality */
    private playerStartPosition: Float32Array | null = null;

    /* Called when component starts */
    start(): void {
        /* Store the player's initial position as start position */
        this.playerStartPosition = this.object.getPositionWorld();

        // Debug log if enabled
        if (this.isDebug) {
            console.log('[Player] Start position stored');
        }
    }

    /* Reset player to their start position */
    resetPlayerToStart(): void {
        if (this.playerStartPosition) {
            // Debug log if enabled
            if (this.isDebug) {
                console.log('[Player] Resetting to start position');
            }

            /* Disable Player Movement while Kinematic to avoid crash */
            const tpsMovement = this.object.getComponent(TpsMovement);
            if (tpsMovement) {
                tpsMovement.setEnabled(false); // Disable Player Movement while Kinematic to avoid crash
            }

            const physx = this.object.getComponent(PhysXComponent);
            if (physx) {
                physx.kinematic = true; // Make physx kinematic to be able to reset its position
            }

            /* Reset player position to start */
            this.object.setPositionWorld(this.playerStartPosition);

            /* Enable Player Movement again (after 150ms to avoid crash from the kinematic)*/
            setTimeout((): void => {
                if (physx) {
                    physx.kinematic = false; // Make physx non-kinematic to be able to move
                }
                if (tpsMovement) {
                    tpsMovement.setEnabled(true); // Enable Player Movement again
                }
            }, 150);

            // Log the death for debugging
            if (this.isDebug) {
                console.log(
                    'Death! Player reset to start position due to spike collision.'
                );
            }
        } else {
            console.warn('Player start position not stored, cannot reset');
        }
    }
}
