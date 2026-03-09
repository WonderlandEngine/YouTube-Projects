import {Component, Property, PhysXComponent} from '@wonderlandengine/api';
import {vec3, quat} from 'gl-matrix';
import {AnimationController} from './animation-controller';
import {DrawLine} from './debugs/draw-line';

/**
 * tps-movement
 * Simple third-person character movement using PhysX, aligned with camera direction.
 * Beginner-friendly code with basic movement, jumping, and animations.
 */
export class TpsMovement extends Component {
    static TypeName = 'tps-movement';
    static Properties = {
        /* Camera */
        headObject: Property.object(), // Camera object for movement direction

        /* Character Animation */
        animatedCharacter: Property.object(), // Character with animations (child of player)

        /* Movement */
        moveSpeed: Property.float(30),
        sprintSpeed: Property.float(40),
        horizontalMovementOnly: Property.bool(false), // Only allow left/right movement (disable W/S)

        /* Jump */
        jumpActive: Property.bool(true), // Enable jumping
        jumpForce: Property.float(23), // Jump strength
        groundCheckDistance: Property.float(1), // Ground detection distance
        fallingBoost: Property.float(1800), // Falling force

        /* Rotation */
        smoothRotation: Property.bool(false),
        smoothRotationSpeed: Property.float(2),
        snapRotation: Property.bool(false),
        snapRotationDegrees: Property.float(45),
    };

    async delay(seconds) {
        return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    }

    init() {
        /* Movement States */
        this.forwardMove = false;
        this.rightMove = false;
        this.backwardMove = false;
        this.leftMove = false;
        this.rightRotate = false;
        this.leftRotate = false;

        /* Direction Priority */
        this.lastVerticalDirection = null;
        this.lastHorizontalDirection = null;
    }

    start() {
        /* Initialize Properties */
        this.movementEnabled = true;
        this.moveSpeedDefault = this.moveSpeed;
        this.isMoving = false;
        this.isJumping = false;
        this.physx = this.object.getComponent(PhysXComponent);

        /* Setup Camera */
        this.headObject = this.headObject || this.object;

        /* Animation Controller */
        this.animController = this.object.getComponent(AnimationController);
        if (!this.animController) {
            console.log(
                "🟠 'animation-controller' component not found. Add it to play animations."
            );
        } else {
            // Set initial idle animation
            setTimeout(() => {
                this.animController?.setAnimation('idle');
            }, 0);
        }
    }

    /* Called when component is activated */
    onActivate() {
        /* Keyboard Input Listeners */
        window.addEventListener('keydown', this.pressKeyboard);
        window.addEventListener('keyup', this.releaseKeyboard);
    }

    /* Called when component is deactivated */
    onDeactivate() {
        /* Remove keyboard event listeners */
        window.removeEventListener('keydown', this.pressKeyboard);
        window.removeEventListener('keyup', this.releaseKeyboard);
    }

    update(dt) {
        /* Skip if movement is disabled */
        if (!this.movementEnabled) return;

        /* XR Gamepad Input */
        this.handleXRGamepadInput();

        /* Movement Update */
        this.moveUpdate(dt);

        /* Smooth Rotation */
        this.smoothRotUpdate();

        /* Falling Physics */
        this.handleFalling(dt);

        /* Jump Animation */
        this.handleJumpAnimation();
    }

    /* Set if tps-movement is enabled or disabled */
    setEnabled(value) {
        this.movementEnabled = value;
        if (!value) {
            this.physx.linearVelocity = [0, this.physx.linearVelocity[1], 0];
        }
    }

    /* Check if player is actively moving (keyboard or VR) */
    isPlayerMoving() {
        return this.forwardMove || this.backwardMove || this.leftMove || this.rightMove;
    }

    /* Keyboard Input Handler */
    pressKeyboard = (input) => {
        /* Convert key to lowercase to handle both cases */
        let key = input.key.toLowerCase();

        /* Keyboard Inputs */
        if (!this.horizontalMovementOnly && (key === 'arrowup' || key === 'w')) {
            /* Move forward */
            this.forwardMove = true;
            this.lastVerticalDirection = 'forward';
        }
        if (!this.horizontalMovementOnly && (key === 'arrowdown' || key === 's')) {
            /* Move backward */
            this.backwardMove = true;
            this.lastVerticalDirection = 'backward';
        }
        if (key === 'arrowright' || key === 'd') {
            if (this.smoothRotation) {
                /* Rotate right */
                this.rightRotate = true;
            } else if (this.snapRotation) {
                this.rotatePhysxObjY(this.object, -this.snapRotationDegrees);
            } else {
                /* Move right */
                this.rightMove = true;
            }
            this.lastHorizontalDirection = 'right';
        }
        if (key === 'arrowleft' || key === 'a') {
            if (this.smoothRotation) {
                /* Rotate left */
                this.leftRotate = true;
            } else if (this.snapRotation) {
                this.rotatePhysxObjY(this.object, this.snapRotationDegrees);
            } else {
                /* Move left */
                this.leftMove = true;
            }
            this.lastHorizontalDirection = 'left';
        }

        /* Sprint start */
        if (key === 'shift') {
            /* Set sprint speed */
            this.moveSpeed = this.sprintSpeed;

            /* Set sprint animation */
            if (this.isMoving && !this.isJumping) {
                this.animController?.setAnimation('run');
            }
        }

        /* Jump */
        if (this.jumpActive && (key === ' ' || key === 'spacebar')) {
            this.jump();
        }
    };

    releaseKeyboard = (input) => {
        /* Convert key to lowercase to handle both cases */
        let key = input.key.toLowerCase();

        /* Keyboard Inputs */
        if (!this.horizontalMovementOnly && (key === 'arrowup' || key === 'w')) {
            /* Stop moving forward */
            this.forwardMove = false;
            this.lastVerticalDirection = null;
        }
        if (!this.horizontalMovementOnly && (key === 'arrowdown' || key === 's')) {
            /* Stop moving backward */
            this.backwardMove = false;
            this.lastVerticalDirection = null;
        }
        if (key === 'arrowright' || key === 'd') {
            if (this.smoothRotation) {
                /* Stop rotating right */
                this.rightRotate = false;
            } else {
                /* Stop moving right */
                this.rightMove = false;
            }
            this.lastHorizontalDirection = null;
        }
        if (key === 'arrowleft' || key === 'a') {
            if (this.smoothRotation) {
                /* Stop rotating left */
                this.leftRotate = false;
            } else {
                /* Stop moving left */
                this.leftMove = false;
            }
            this.lastHorizontalDirection = null;
        }

        /* Sprint end */
        if (key === 'shift') {
            /* Reset move speed to default */
            this.moveSpeed = this.moveSpeedDefault;

            /* Set walk animation */
            if (this.isMoving && !this.isJumping) {
                this.animController?.setAnimation('walk');
            }
        }
    };

    /* XR Gamepad Input Handler */
    handleXRGamepadInput() {
        /* Check if XR session is active */
        const xrSession = this.engine.xr?.session;
        if (!xrSession) return;

        /* Reset movement states first */
        this.forwardMove = false;
        this.backwardMove = false;
        this.leftMove = false;
        this.rightMove = false;
        this.lastVerticalDirection = null;
        this.lastHorizontalDirection = null;

        /* Process XR input sources - both hands for movement */
        for (let i = 0; i < xrSession.inputSources.length; ++i) {
            let input = xrSession.inputSources[i];
            let gamepad = input.gamepad;
            if (!gamepad) continue;

            /* Get joystick axes */
            let xAxis = gamepad.axes[2]; // Left/Right stick (axis 2)
            let yAxis = gamepad.axes[3]; // Forward/Backward stick (axis 3)

            /* Apply deadzone to prevent drift */
            const deadzone = 0.15;
            if (Math.abs(xAxis) < deadzone) xAxis = 0;
            if (Math.abs(yAxis) < deadzone) yAxis = 0;

            /* Map joystick to movement states */
            // Right stick = D key (right movement)
            if (xAxis > 0) {
                this.rightMove = true;
                this.leftMove = false;
                this.lastHorizontalDirection = 'right';
            }
            // Left stick = A key (left movement)
            else if (xAxis < 0) {
                this.leftMove = true;
                this.rightMove = false;
                this.lastHorizontalDirection = 'left';
            }

            /* Forward/Backward movement */
            if (!this.horizontalMovementOnly) {
                // Forward stick = W key
                if (yAxis < 0) {
                    this.forwardMove = true;
                    this.backwardMove = false;
                    this.lastVerticalDirection = 'forward';
                }
                // Backward stick = S key
                else if (yAxis > 0) {
                    this.backwardMove = true;
                    this.forwardMove = false;
                    this.lastVerticalDirection = 'backward';
                }
            }

            /* Handle XR buttons for jump */
            if (this.jumpActive && gamepad.buttons[0]?.pressed) {
                this.jump();
            }
        }
    }

    moveUpdate(dt) {
        /* Calculate Movement Direction */
        let direction = [0, 0, 0];

        /* Forward & Backward Movement */
        if (
            this.lastVerticalDirection == 'forward' ||
            (this.lastVerticalDirection == null && this.forwardMove)
        ) {
            direction[2] -= 1.0;
        } else if (
            this.lastVerticalDirection == 'backward' ||
            (this.lastVerticalDirection == null && this.backwardMove)
        ) {
            direction[2] += 1.0;
        }

        /* Left & Right Movement */
        if (
            this.lastHorizontalDirection == 'left' ||
            (this.lastHorizontalDirection == null && this.leftMove)
        ) {
            direction[0] -= 1.0;
        } else if (
            this.lastHorizontalDirection == 'right' ||
            (this.lastHorizontalDirection == null && this.rightMove)
        ) {
            direction[0] += 1.0;
        }

        /* Normalize and Scale Direction */
        vec3.normalize(direction, direction);
        direction[0] *= this.moveSpeed;
        direction[2] *= this.moveSpeed;

        /* Camera-Aligned Movement */
        const cameraYaw = this.headObject.getRotationWorld();
        const forwardFlat = vec3.fromValues(0, 0, -1);
        const rightFlat = vec3.fromValues(1, 0, 0);

        vec3.transformQuat(forwardFlat, forwardFlat, cameraYaw);
        vec3.transformQuat(rightFlat, rightFlat, cameraYaw);

        // Flatten Y axis for horizontal movement
        forwardFlat[1] = 0;
        rightFlat[1] = 0;
        vec3.normalize(forwardFlat, forwardFlat);
        vec3.normalize(rightFlat, rightFlat);

        // Calculate final movement direction
        const move = vec3.create();
        vec3.scaleAndAdd(move, move, rightFlat, direction[0]);
        vec3.scaleAndAdd(move, move, forwardFlat, -direction[2]);
        vec3.normalize(direction, move);
        vec3.scale(direction, direction, this.moveSpeed);

        /* Apply Movement */
        if (this.forwardMove || this.backwardMove || this.leftMove || this.rightMove) {
            direction[1] = 0; // No Y-axis movement
            this.physx.addForce(direction); // Apply movement force
            this.rotateAnimatedCharacter(direction, dt); // Rotate character
        } else {
            // Stop horizontal movement, keep gravity
            this.physx.linearVelocity = [0, this.physx.linearVelocity[1], 0];
        }

        /* Update Movement State */
        this.isMoving = vec3.length(direction) > 0;

        /* Handle Animations */
        this.handleMovementAnimations();
    }

    handleMovementAnimations() {
        /* Skip if jumping */
        if (this.isJumping) return;

        /* Play Movement Animations */
        if (this.isMoving) {
            if (this.moveSpeed == this.sprintSpeed) {
                this.animController?.setAnimation('run');
            } else {
                this.animController?.setAnimation('walk');
            }
        } else {
            this.animController?.setAnimation('idle');
        }
    }

    smoothRotUpdate() {
        /* Smooth Rotation Controls */
        if (this.smoothRotation) {
            if (this.rightRotate) {
                this.physx.angularVelocity = [0, -this.smoothRotationSpeed, 0];
            }
            if (this.leftRotate) {
                this.physx.angularVelocity = [0, this.smoothRotationSpeed, 0];
            }
        }
    }

    rotateAnimatedCharacter(direction, dt) {
        /* Rotate Character to Face Movement Direction */
        if (!this.animatedCharacter) return;

        // Normalize direction vector
        vec3.normalize(direction, direction);

        // Get current character rotation
        let currentRotation = quat.create();
        this.animatedCharacter.getRotationWorld(currentRotation);

        // Calculate target direction (horizontal plane only)
        let targetDirection = vec3.fromValues(direction[0], 0, direction[2]);
        vec3.normalize(targetDirection, targetDirection);

        // Character's default forward vector
        let forward = vec3.fromValues(0, 0, 1);

        // Calculate target rotation
        let targetRotation = quat.create();
        quat.rotationTo(targetRotation, forward, targetDirection);

        // Smooth rotation interpolation
        quat.slerp(currentRotation, currentRotation, targetRotation, dt * 7);

        // Apply rotation to character
        this.animatedCharacter.setRotationWorld(currentRotation);
    }

    async rotatePhysxObjY(obj, rot) {
        /* Snap Rotation Function */
        const physxComp = obj.getComponent(PhysXComponent);
        physxComp.kinematic = true; // Enable kinematic mode
        obj.rotateAxisAngleDegObject([0, 1, 0], rot); // Rotate on Y axis
        await this.delay(0.04); // Wait for physics update
        physxComp.kinematic = false; // Disable kinematic mode
    }

    isOnGround() {
        /* Ground Detection using Raycast */
        const position = vec3.create();
        this.object.getPositionWorld(position);
        position[1] += 0.85; // Adjust raycast start position

        const direction = vec3.fromValues(0, -1, 0); // Downward ray

        // Perform raycast
        const hit = this.engine.physics.rayCast(
            position,
            direction,
            1 << 0, // Group mask
            this.groundCheckDistance
        );

        let hitPoint = null;
        let hitSomething = false;

        // Check for ground collision (ignore self)
        for (let i = 0; i < hit.hitCount; ++i) {
            if (
                hit.objects[i].name !== this.object.name &&
                hit.distances[i] < this.groundCheckDistance
            ) {
                hitSomething = true;
                hitPoint = hit.locations[i];
                break;
            }
        }

        /* Visualize the raycast */
        const drawLineComp = this.object.getComponent(DrawLine);
        if (drawLineComp && drawLineComp.active) {
            if (hitSomething) {
                // Green line when hitting ground
                drawLineComp.drawLine(position, hitPoint, true, 1, [0, 1, 0, 1]);
            } else {
                // Red line when no ground detected
                const endPoint = [
                    position[0] + direction[0] * this.groundCheckDistance,
                    position[1] + direction[1] * this.groundCheckDistance,
                    position[2] + direction[2] * this.groundCheckDistance,
                ];
                drawLineComp.drawLine(position, endPoint, false, 1, [1, 0, 0, 1]);
            }
        }

        return hitSomething;
    }

    jump() {
        /* Jump if on Ground and Jumping is Active */
        if (this.jumpActive && this.isOnGround()) {
            // Apply vertical velocity
            const currentVelocity = this.physx.getLinearVelocity(vec3.create());
            currentVelocity[1] = this.jumpForce;
            this.physx.linearVelocity = currentVelocity;

            // Set jump state and animation
            this.isJumping = true;
            this.animController?.setAnimation('jump');
        }
    }

    handleJumpAnimation() {
        /* Reset Jump State when Landing */
        if (this.isJumping && this.isOnGround()) {
            this.isJumping = false;
        }
    }

    handleFalling(dt) {
        /* Falling Physics and Animation */
        const isAirborne = !this.isOnGround();

        // Apply downward force when airborne
        if (isAirborne) {
            this.physx.addForce([0, -this.fallingBoost * dt, 0]);
        }

        // Start falling animation if not already jumping
        if (isAirborne && !this.isJumping) {
            this.isJumping = true;
            this.animController?.setAnimation('jump');
        }
    }
}
