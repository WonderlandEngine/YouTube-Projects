import {
    Component,
    Property,
    CollisionEventType,
    PhysXComponent,
    Object3D,
    property,
} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';
import {TpsMovement} from './tps-movement.js';

/**
 * Moving Platform Component
 * A moving kinematic physx platform that loops between start and end position
 * It applies platform velocity to the player if they are on the platform, so the player can move with the platform
 * The player can move naturally on the platform, without being affected by the platform velocity
 * Simple and beginner-friendly implementation
 */
export class MovingPlatform extends Component {
    static TypeName = 'moving-platform';

    /* Properties configurable in the editor */
    @property.vector3(0, 0, 0)
    startPosition!: vec3; // Position to move from

    @property.vector3(0, 0, 0)
    endPosition!: vec3; // Position to move to

    @property.float(1.0)
    speed!: number; // Speed of the platform

    @property.float(1.0)
    pauseTime!: number; // Time to pause before moving back

    /* Internal state tracking */
    private currentPosition = vec3.create();
    private platformVelocity = vec3.create();
    private movingToEnd = true;
    private pauseTimer = 0;
    private playerOnPlatform: Object3D | null = null;

    /* Called when component is activated */
    onActivate() {
        // Attach collision listener
        const physx = this.object.getComponent(PhysXComponent);
        if (physx) {
            physx.onCollision((type: CollisionEventType, other: PhysXComponent) => {
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
    }

    /* Called when component is deactivated */
    onDeactivate() {
        // Clean up if needed
    }

    /* Initialization */
    start() {
        // Initialize platform state - convert Property to vec3
        vec3.copy(this.currentPosition, this.startPosition);
        vec3.zero(this.platformVelocity); // Initialize platform velocity
        this.movingToEnd = true;
        this.pauseTimer = 0;
        this.playerOnPlatform = null; // Track the player if they are on the platform
    }

    /* Called every frame */
    update(dt: number) {
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
    private movePlatform(dt: number, previousPosition: vec3) {
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
    private applyPlatformVelocityToPlayer() {
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
