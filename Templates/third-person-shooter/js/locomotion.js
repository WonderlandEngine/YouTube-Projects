import {Component, Property} from '@wonderlandengine/api';
import {vec3, quat} from 'gl-matrix';

/**
 * Locomotion
 * A flexible and easy-to-understand locomotion system for Wonderland Engine.
 */
export class Locomotion extends Component {
    static TypeName = 'locomotion';

    /* Configurable properties */
    static Properties = {
        moveSpeed: Property.float(4.0),
        sprintMultiplier: Property.float(1.5),
        jumpForce: Property.float(8.0),
        gravity: Property.float(9.81),
        smoothRotation: Property.bool(true),
        rotationSpeed: Property.float(5.0),
        rotateLeftKey: Property.string('q'),
        rotateRightKey: Property.string('e'),
        headObject: Property.object() // Usually player's 'NonVRCamera'
    };

    start() {
        this.velocity = vec3.create();
        this.isJumping = false;
        this.isSprinting = false;
        this.forward = vec3.fromValues(0, 0, -1);
        this.right = vec3.fromValues(1, 0, 0);

        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    update(dt) {
        this.applyGravity(dt);
        this.move(dt);
        this.applyJump(dt);
    }

    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        if (key === 'w') this.velocity[2] = -1;
        if (key === 's') this.velocity[2] = 1;
        if (key === 'a') this.velocity[0] = -1;
        if (key === 'd') this.velocity[0] = 1;
        if (key === 'shift') this.isSprinting = true;
        if (key === ' ') this.jump();
    }

    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        if (key === 'w' || key === 's') this.velocity[2] = 0;
        if (key === 'a' || key === 'd') this.velocity[0] = 0;
        if (key === 'shift') this.isSprinting = false;
    }

    move(dt) {
        const speed = this.isSprinting ? this.moveSpeed * this.sprintMultiplier : this.moveSpeed;
        const movement = vec3.create();

        if (this.headObject) {
            const headForward = vec3.create();
            this.headObject.getForwardWorld(headForward);
            headForward[1] = 0; // Zero out Y component
            vec3.normalize(headForward, headForward);
            vec3.scaleAndAdd(movement, movement, headForward, -this.velocity[2]);

            const headRight = vec3.create();
            this.headObject.getRightWorld(headRight);
            headRight[1] = 0; // Zero out Y component
            vec3.normalize(headRight, headRight);
            vec3.scaleAndAdd(movement, movement, headRight, this.velocity[0]);
        } else {
            vec3.scaleAndAdd(movement, movement, this.forward, -this.velocity[2]);
            vec3.scaleAndAdd(movement, movement, this.right, this.velocity[0]);
        }

        vec3.scale(movement, movement, speed * dt);
        this.object.translate(movement);
    }

    applyJump(dt) {
        if (this.isJumping) {
            const jumpMovement = vec3.create();
            vec3.scale(jumpMovement, [0, this.velocity[1], 0], dt);
            this.object.translate(jumpMovement);
        }
    }

    applyGravity(dt) {
        if (!this.isOnGround()) {
            this.velocity[1] -= this.gravity * dt;
        } else {
            this.velocity[1] = 0;
            this.isJumping = false;
        }
    }

    jump() {
        console.log('jump key pressed');
        if (!this.isJumping && this.isOnGround()) {
            this.velocity[1] = this.jumpForce;
            this.isJumping = true;
            this.playAnimation('jump-start');
        }
    }

    isOnGround() {
        // Simplified ground check
        return this.object.getPositionWorld()[1] <= 0.5;
    }

    playAnimation(currentState) {
        // Placeholder for animation handling logic
        console.log(`Playing animation: ${currentState}`);
    }
}
