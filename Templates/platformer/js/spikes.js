import {
    Component,
    Property,
    CollisionEventType,
    PhysXComponent,
} from '@wonderlandengine/api';
import {Player} from './player';

/**
 * spikes
 */
export class Spikes extends Component {
    static TypeName = 'spikes';
    /* Properties that are configurable in the editor */
    static Properties = {};

    /* Called when component is activated */
    onActivate() {
        /* Set up Collision Detection */
        this.setupCollisionListener();
    }

    /* Called when component is deactivated */
    onDeactivate() {
        // Remove collision listener
        this.object.getComponent(PhysXComponent)?.removeCollisionCallback();
    }

    /* Set up collision detection for spikes */
    setupCollisionListener() {
        // Get the physx component
        const physx = this.object.getComponent(PhysXComponent);

        // If the physx component is not found, log an error
        if (!physx) {
            console.warn('Spikes need a physx component for collision detection!');
            return;
        }

        // Listen for collisions with the player
        physx.onCollision((type, other) => {
            // Only trigger on initial touch with player
            if (type === CollisionEventType.Touch && other.object.name === 'Player') {
                // Get the player component and call its reset function
                const playerComponent = other.object.getComponent(Player);
                if (playerComponent) {
                    playerComponent.resetPlayerToStart();
                } else {
                    console.warn('Player object does not have a player component!');
                }
            }
        });
    }
}
