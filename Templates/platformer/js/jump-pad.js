import {
    Component,
    Property,
    CollisionEventType,
    PhysXComponent,
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
    static Properties = {
        jumpForce: Property.float(50.0), // How strong the jump boost is
        cooldownTime: Property.float(0.5), // Time before pad can be used again
    };

    /* Initialization */
    start() {
        // Track cooldown to prevent spam jumping
        this.cooldownTimer = 0;

        // Remember starting position
        this.returnPos = vec3.create();
        this.object.getPositionLocal(this.returnPos);
    }

    /* Called when component is activated */
    onActivate() {
        // Set up collision detection
        this.setupCollisionListener();
    }

    /* Called when component is deactivated */
    onDeactivate() {
        // Remove collision listener
        this.object.getComponent(PhysXComponent)?.removeCollisionCallback();
    }

    /* Called every frame */
    update(dt) {
        // Update cooldown timer
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }
    }

    /* Set up collision detection for the jump pad */
    setupCollisionListener() {
        const physx = this.object.getComponent(PhysXComponent);
        if (!physx) {
            console.warn('Jump pad needs a physx component!');
            return;
        }

        // Listen for collisions with the player
        physx.onCollision((type, other) => {
            // If player touches the jump pad, launch them upward
            if (type === CollisionEventType.Touch && other.object.name === 'Player') {
                this.launchPlayer(other.object);
            }
        });
    }

    /* Launch the player upward */
    launchPlayer(playerObject) {
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
    animateJumpPad() {
        // Translate the jump pad down
        this.object.translateLocal([0.0, -0.5, 0.0]);

        // Wait for cooldown time and then return to starting position
        setTimeout(() => {
            this.object.setPositionLocal(this.returnPos);
        }, this.cooldownTime * 1000); // Convert seconds to milliseconds
    }
}
