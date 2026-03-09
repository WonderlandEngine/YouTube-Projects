import {
    Component,
    Property,
    CollisionEventType,
    PhysXComponent,
    Object3D,
    property,
} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';

/**
 * Jump Pad Component
 * Launches the player upward when they collide with it
 * Simple and beginner-friendly implementation
 */
export class JumpPad extends Component {
    static TypeName = 'jump-pad';

    /* Properties configurable in the editor */
    @property.float(50.0)
    jumpForce!: number; // How strong the jump boost is

    @property.float(0.5)
    cooldownTime!: number; // Time before pad can be used again

    /* Internal state tracking */
    private cooldownTimer = 0;
    private returnPos = vec3.create();
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

    /* Initialization */
    start() {
        // Remember starting position
        this.object.getPositionLocal(this.returnPos);
    }

    /* Called every frame */
    update(dt: number) {
        // Update cooldown timer
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }
    }

    /* Set up collision detection for the jump pad */
    private setupCollisionListener() {
        const physx = this.object.getComponent(PhysXComponent);
        if (!physx) {
            console.warn('Jump pad needs a physx component!');
            return;
        }

        // Listen for collisions with the player and store callback ID
        this.collisionCallbackId = physx.onCollision(
            (type: CollisionEventType, other: PhysXComponent) => {
                // If player touches the jump pad, launch them upward
                if (type === CollisionEventType.Touch && other.object.name === 'Player') {
                    this.launchPlayer(other.object);
                }
            }
        );
    }

    /* Launch the player upward */
    private launchPlayer(playerObject: Object3D) {
        // Check if pad is on cooldown
        if (this.cooldownTimer > 0) {
            return;
        }

        // Get player's physics component
        const playerPhysx = playerObject.getComponent(PhysXComponent);
        if (!playerPhysx) {
            return;
        }

        // Create upward force vector
        const jumpVector = vec3.fromValues(0, this.jumpForce, 0);

        // Get current player velocity and preserve horizontal movement
        const currentVelocity = vec3.clone(playerPhysx.linearVelocity);

        // Set vertical velocity to jump force, keep horizontal velocity
        const newVelocity = vec3.fromValues(
            currentVelocity[0], // Keep X velocity
            this.jumpForce, // Set Y velocity to jump force
            currentVelocity[2] // Keep Z velocity
        );

        // Apply the new velocity to launch player
        playerPhysx.linearVelocity = newVelocity;

        // Start cooldown to prevent spam jumping
        this.cooldownTimer = this.cooldownTime;

        // Animate the jump pad
        this.animateJumpPad();
    }

    /* Animate the jump pad up and down */
    private animateJumpPad() {
        // Translate the jump pad down
        this.object.translateLocal([0.0, -0.5, 0.0]);

        // Wait for cooldown time and then return to starting position
        setTimeout(() => {
            this.object.setPositionLocal(this.returnPos);
        }, this.cooldownTime * 1000); // Convert seconds to milliseconds
    }
}
