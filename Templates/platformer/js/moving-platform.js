import {
    Component,
    Property,
    CollisionEventType,
    PhysXComponent,
} from '@wonderlandengine/api';
import {TpsMovement} from './tps-movement';
import {vec3} from 'gl-matrix';

/**
 * moving-platform
 * A moving kinematic physx platform that loops between start and end position
 * It applies platform velocity to the player if they are on the platform, so the player can move with the platform
 * The player can move naturally on the platform, without being affected by the platform velocity
 */
export class MovingPlatform extends Component {
    static TypeName = 'moving-platform';
    /* Properties that are configurable in the editor */
    static Properties = {
        startPosition: Property.vector3(0, 0, 0), // Position to move from
        endPosition: Property.vector3(0, 0, 0), // Position to move to
        speed: Property.float(1.0), // Speed of the platform
        pauseTime: Property.float(1.0), // Time to pause before moving back
    };

    /* Initialization on start */
    start() {
        // Initialize platform state - convert Property to vec3
        this.currentPosition = vec3.clone(this.startPosition);
        this.platformVelocity = vec3.create(); // Initialize platform velocity
        this.movingToEnd = true;
        this.pauseTimer = 0;
        this.playerOnPlatform = null; // Track the player if they are on the platform
    }

    /* Called when component is activated */
    onActivate() {
        // Attach collision listener
        this.object.getComponent(PhysXComponent).onCollision((type, other) => {
            if (type === CollisionEventType.Touch && other.object.name === 'Player') {
                this.playerOnPlatform = other.object;
            } else if (
                type === CollisionEventType.TouchLost &&
                other.object.name === 'Player'
            ) {
                this.playerOnPlatform = null;
            }
        });
    }

    /* Called when component is deactivated */
    onDeactivate() {
        // Clean up if needed
    }

    /* Called every frame */
    update(dt) {
        // Store previous position for velocity calculation
        const previousPosition = vec3.clone(this.currentPosition);

        // Handle pausing
        if (this.pauseTimer > 0) {
            this.pauseTimer -= dt;
            return;
        }

        // Move platform
        this.movePlatform(dt, previousPosition);

        // Apply position to platform
        this.object.setPositionWorld(this.currentPosition);

        // Apply platform velocity to player if on platform
        this.applyPlatformVelocityToPlayer();
    }

    /* Move platform from start to end position */
    movePlatform(dt, previousPosition) {
        // Calculate movement direction
        const targetPosition = this.movingToEnd ? this.endPosition : this.startPosition;

        // Create direction vector using vec3 operations
        const direction = vec3.create();
        vec3.subtract(direction, targetPosition, this.currentPosition);
        vec3.normalize(direction, direction);

        const distance = this.speed * dt;

        // Move platform
        const movement = vec3.create();
        vec3.scale(movement, direction, distance);
        vec3.add(this.currentPosition, this.currentPosition, movement);

        // Calculate platform velocity and store it as class property
        vec3.subtract(this.platformVelocity, this.currentPosition, previousPosition);
        vec3.scale(this.platformVelocity, this.platformVelocity, 1 / dt);

        // Check if target reached
        const distanceToTarget = vec3.distance(this.currentPosition, targetPosition);
        if (distanceToTarget < 0.1) {
            vec3.copy(this.currentPosition, targetPosition);
            this.movingToEnd = !this.movingToEnd;
            this.pauseTimer = this.pauseTime;
        }
    }

    /* Apply platform velocity to player, so the player can move with the platform they stand on */
    applyPlatformVelocityToPlayer() {
        if (this.playerOnPlatform) {
            const playerPhysx = this.playerOnPlatform.getComponent(PhysXComponent);
            const playerMovement = this.playerOnPlatform.getComponent(TpsMovement);

            if (playerPhysx && playerMovement) {
                // Check if player is actively moving (keyboard or VR)
                if (playerMovement.isPlayerMoving()) {
                    // Skip applying platform velocity if player is moving, to be able to move naturally on the platform
                    return;
                }

                // Get the player's velocity
                const playerVelocity = vec3.clone(playerPhysx.linearVelocity);

                // Only add horizontal platform velocity (X and Z)
                const horizontalVelocity = vec3.fromValues(
                    this.platformVelocity[0],
                    0,
                    this.platformVelocity[2]
                );
                vec3.add(playerVelocity, playerVelocity, horizontalVelocity);
                playerPhysx.linearVelocity = playerVelocity;
            }
        }
    }
}
