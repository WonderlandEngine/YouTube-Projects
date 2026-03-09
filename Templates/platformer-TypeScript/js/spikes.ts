import {
    Component,
    CollisionEventType,
    PhysXComponent,
    Object3D,
    property,
} from '@wonderlandengine/api';
import {Player} from './player.js';

/**
 * Spikes Component
 * Kills the player when they touch the spikes
 * Simple and beginner-friendly implementation
 */
export class Spikes extends Component {
    static TypeName = 'spikes';

    /* Properties configurable in the editor */
    @property.bool(false)
    isDebug!: boolean; // Enable debug logs?

    /* Internal state tracking */
    private collisionCallbackId: number | null = null;

    /* Called when component is activated */
    onActivate() {
        // Set up collision detection
        this.setupCollisionListener();
    }

    /* Called when component is deactivated */
    onDeactivate() {
        // Remove collision listener using stored callback ID
        if (this.collisionCallbackId !== null) {
            const physx = this.object.getComponent(PhysXComponent);
            if (physx) {
                physx.removeCollisionCallback(this.collisionCallbackId);
            }
            this.collisionCallbackId = null;
        }
    }

    /* Set up collision detection for spikes */
    private setupCollisionListener() {
        // Get the physx component
        const physx = this.object.getComponent(PhysXComponent);

        // If the physx component is not found, log an error
        if (!physx) {
            console.warn('Spikes need a physx component for collision detection!');
            return;
        }

        // Listen for collisions with the player and store callback ID
        this.collisionCallbackId = physx.onCollision(
            (type: CollisionEventType, other: PhysXComponent) => {
                // Only trigger on initial touch with player
                if (type === CollisionEventType.Touch && other.object.name === 'Player') {
                    this.handlePlayerCollision(other.object);
                }
            }
        );
    }

    /* Handle player collision with spikes */
    private handlePlayerCollision(playerObject: Object3D) {
        // Debug log if enabled
        if (this.isDebug) {
            console.log('[Spikes] Player touched spikes!');
        }

        // Get the player component and call its reset function
        const playerComponent = playerObject.getComponent(Player);
        if (playerComponent) {
            playerComponent.resetPlayerToStart();
        } else {
            console.warn('Player object does not have a player component!');
        }
    }
}
