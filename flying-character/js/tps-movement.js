import {Component, LockAxis, Property} from '@wonderlandengine/api';
import {vec3, quat} from 'gl-matrix';

/*
# TODO:
- Add records for properties organization.
- Cleanup the code and remove the unused functions, and remove the VR Support.
*/

/**
 * tps-movement
 * Basic third-person character movement using PhysX, aligned with camera direction.
 */
export class TpsMovement extends Component {
    static TypeName = 'tps-movement';
    static Properties = {
        /* Object of which the orientation is used to determine forward direction if you want to move according to camera */
        headObject: Property.object(), //Usually 'NonVRCamera'
        eyeLeft: Property.object(), //'eyeLeft' for VR

        /* Character Animation */
        animatedCharacter: Property.object(), //The character that has animations, should be a child of the player

        /* Movement */
        moveActive: Property.bool(true),
        moveSpeed: Property.float(30),
        sprintActive: Property.bool(true),
        sprintSpeed: Property.float(40),
        debugRaycast: Property.bool(false), // Enable/disable raycast visualization

        /* Jump */
        jumpActive: Property.bool(true), // Enable jumping
        jumpForce: Property.float(23), // Jump force, adjust this value to make the jump higher or lower
        groundCheckDistance: Property.float(1), //Checking if the player is on the ground based on distance from the ground, adjust this if jumping on air or can't jump
        fallingBoost: Property.float(1800), // Tune this value for how hard they fall

        /* Rotation */
        smoothRotation: Property.bool(false),
        smoothRotationSpeed: Property.float(2),
        snapRotation: Property.bool(false), //Must disable smoothRot for snapRot to work
        snapRotationDegrees: Property.float(45),

        /* Physx component options (Enable physx visualization on runtime for easier configuration) */
        radiusPhysx: Property.float(0.25),
        capsuleHeightPhysx: Property.float(0.3),
        translationOffsetPhysx: Property.vector3(0, 0, 0),
        rotOffsetPhysx: Property.vector3(0, 0, 90),
        linearDampingPhysx: Property.float(2),
        angularDampingPhysx: Property.float(5),
    };

    async delay(seconds) {
        return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    }

    init() {
        /* Movement */
        this.forwardMove = false;
        this.rightMove = false;
        this.backwardMove = false;
        this.leftMove = false;
        this.rightRotate = false;
        this.leftRotate = false;

        /* Track last direction, for choosing pirority direction */
        this.lastVerticalDirection = null;
        this.lastHorizontalDirection = null;
    }

    start() {
        /* General */
        this.moveSpeedDefault = this.moveSpeed;
        this.isMoving = false; // Track whether the character is moving
        this.isJumping = false; // Track whether the character is jumping
        this.isAiming = false; // Track whether the character is aiming
        this.isFiring = false; // Track whether the character is firing
        this.isReloading = false; // Track whether the character is reloading
        this.timeSinceLastRaycast = 0;
        this.physx = this.object.getComponent('physx');

        /* Create 'Physx' Component */
        // this.createPhysxComponent();

        /* Set headObject */
        this.headObject = this.headObject || this.object;
        this.engine.onXRSessionStart.add(this.onSessionStart);
        this.engine.onXRSessionEnd.add(this.onSessionEnd);

        /* Set Keyboard Inputs Listeners */
        window.addEventListener('keydown', this.pressKeyboard.bind(this));
        window.addEventListener('keyup', this.releaseKeyboard.bind(this));

        /* Animation */
        this.animController = this.object.getComponent('animation-controller');
        if (!this.animController) {
            console.log(
                "🟠 'animation-controller' component not found on the same object. Please add it to the same object to play animations."
            );
        } else {
            // Wait one frame so animation component is ready
            setTimeout(() => {
                this.animController?.setAnimation('idle'); // Set initial animation to idle
            }, 0);
        }
    }

    update(dt) {
        /* Set VR Inputs, Thumbstick Gamepad Controls */
        this.vrGamepadEvents(dt);

        /* Move */
        this.moveUpdate(dt);

        /* Smooth rotation */
        this.smoothRotUpdate();

        /* Check if player is on ground for jumping */
        // Update the timer
        this.timeSinceLastRaycast += dt;

        // Check if 0.5 seconds have passed
        // if (this.timeSinceLastRaycast >= 0.25) {
        //     // Reset the timer
        //     this.timeSinceLastRaycast = 0;

        //     // Check if the player is on the ground
        //     this.isOnGround();
        // }

        /* Handle falling */
        this.handleFalling(dt);

        /* Handle jump animation in animatedCharacter */
        //console.log('isOnGround: ', this.isOnGround());
        this.handleJumpAnimation();
    }

    // createPhysxComponent() {
    //     /* Create 'Physx' Component */
    //     // Rotation from Euler to Quat
    //     this.rotOffsetPhysxQuat = [0, 0, 0, 0];
    //     quat.fromEuler(
    //         this.rotOffsetPhysxQuat,
    //         this.rotOffsetPhysx[0],
    //         this.rotOffsetPhysx[1],
    //         this.rotOffsetPhysx[2]
    //     );

    //     // Determine the appropriate angular lock based on the smoothRotation setting
    //     let angularLockAxis = LockAxis.X | LockAxis.Z; // Default lock all angularAxis except for Y
    //     if (!this.smoothRotation) {
    //         angularLockAxis |= LockAxis.Y; // Lock Y as well if smooth rotation is disabled, to prevent rotation on colliding with other objects
    //     }

    //     // Physx options
    //     this.object.addComponent('physx', {
    //         shape: 2, // Capsule
    //         extents: [this.radiusPhysx, this.capsuleHeightPhysx, 1],
    //         translationOffset: this.translationOffsetPhysx,
    //         rotationOffset: this.rotOffsetPhysxQuat,
    //         gravity: true,
    //         kinematic: false,
    //         linearDamping: this.linearDampingPhysx,
    //         angularDamping: this.angularDampingPhysx,
    //         angularLockAxis: angularLockAxis,
    //         bounciness: 0.25,
    //     });
    // }

    setAiming(isAiming) {
        /* Set aiming state (Gets set from "thirdperson-camera") */
        this.isAiming = isAiming;
    }

    setFiring(isFiring) {
        /* Set firing - auto switch to aim animations (Gets set from "player-weapon-manager") */
        this.isFiring = isFiring;
    }

    moveUpdate(dt) {
        /* Calculate direction */
        this.headForward = [0, 0, 0];
        let direction = [0, 0, 0];

        /* Move Forward & Backward */
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

        /* Move Left & Right */
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

        /* Normalize direction */
        vec3.normalize(direction, direction);
        direction[0] *= this.moveSpeed;
        direction[2] *= this.moveSpeed;

        /* Get clean flat forward/right vectors from camera yaw */
        // Try to get the camera component directly for more accurate rotation
        let cameraYaw;
        const cameraComponent = this.headObject.getComponent('thirdperson-camera');

        if (cameraComponent && (this.isAiming || this.isFiring)) {
            // During aiming/firing, use the camera's internal yaw for more accurate movement
            // Create quaternion from camera's yaw only (ignore pitch for movement)
            const yaw = cameraComponent.yaw;
            cameraYaw = [0, Math.sin(yaw * 0.5), 0, Math.cos(yaw * 0.5)];
        } else {
            // Use the head object's world rotation as fallback
            cameraYaw = this.headObject.getRotationWorld();
        }

        const forwardFlat = vec3.fromValues(0, 0, -1);
        const rightFlat = vec3.fromValues(1, 0, 0);

        vec3.transformQuat(forwardFlat, forwardFlat, cameraYaw);
        vec3.transformQuat(rightFlat, rightFlat, cameraYaw);

        /* Flatten Y axis */
        forwardFlat[1] = 0;
        rightFlat[1] = 0;

        vec3.normalize(forwardFlat, forwardFlat);
        vec3.normalize(rightFlat, rightFlat);

        // new direction using camera-aligned forward/right
        const move = vec3.create();
        vec3.scaleAndAdd(move, move, rightFlat, direction[0]);
        vec3.scaleAndAdd(move, move, forwardFlat, -direction[2]);
        vec3.normalize(direction, move);
        vec3.scale(direction, direction, this.moveSpeed);

        /* Move via velocity Physx */
        if (this.moveActive) {
            if (this.forwardMove || this.backwardMove || this.leftMove || this.rightMove) {
                /* Not to move on Y axis */
                direction[1] = 0;

                /* Move the object */
                // this.physx.linearVelocity = direction; // Move, with linearVelocity
                this.physx.addForce(direction); // Move, with force

                /* Rotate the animated character to face the direction of movement */
                this.rotateAnimatedCharacter(direction, dt);
            } else {
                // ✋ Stop the character instantly when there's no input
                this.physx.linearVelocity = [0, this.physx.linearVelocity[1], 0]; // Keep Y axis to preserve gravity/jumping
            }
        }

        /* Check if there's any movement */
        this.isMoving = vec3.length(direction) > 0;

        /* Trigger animations based on movement state */
        if (this.isAiming || this.isFiring) {
            // Handle aim & firing animations
            this.handleAimAnimations();
        } else {
            // Handle regular movement animations
            this.handleMovementAnimations();
        }
    }

    handleMovementAnimations() {
        /* Don't proceed if jumping, or reloading */
        if (this.isJumping == true) return;
        if (this.isReloading == true) return;

        /* Handle regular movement animations */
        if (this.isMoving) {
            // Start walking/running animation
            if (this.moveSpeed == this.sprintSpeed) {
                this.animController?.setAnimation('run');
            } else {
                this.animController?.setAnimation('walk');
            }
        } else {
            // If not moving, start idle animation
            this.animController?.setAnimation('idle');
        }
    }

    handleAimAnimations() {
        /* Don't proceed if jumping, or reloading */
        if (this.isJumping == true) return;
        if (this.isReloading == true) return;

        /* Handle aim movement animations */
        if (this.forwardMove) {
            this.animController?.setAnimation('aimMoveForward');
        } else if (this.backwardMove) {
            this.animController?.setAnimation('aimMoveBackward');
        } else if (this.rightMove) {
            this.animController?.setAnimation('aimMoveRight');
        } else if (this.leftMove) {
            this.animController?.setAnimation('aimMoveLeft');
        } else {
            // If not moving, start idle animation
            this.animController?.setAnimation('aimIdle');
        }
    }

    smoothRotUpdate() {
        /* Smooth rotation via Velocity Physx */
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
        /* Rotate the Animated Character Mesh to face the direction of movement */
        /* This doesn't rotate the physx capsule */
        /* If the rotation doesn't work while the character is playing animation,
         * then make sure to create an empty parent as the animated character instead, and add to it the 'animation' component
         */

        // Don't play animatioans if there's no animated character
        if (this.animatedCharacter == null) return;

        // Don't rotate if aiming or firing
        if (this.isAiming == true || this.isFiring == true) return;

        // Ensure the direction vector is normalized
        vec3.normalize(direction, direction);

        // Get the current rotation of the animated character
        let currentRotation = quat.create();
        this.animatedCharacter.getRotationWorld(currentRotation);

        // Calculate the target forward direction (on the horizontal plane)
        let targetDirection = vec3.fromValues(direction[0], 0, direction[2]);
        vec3.normalize(targetDirection, targetDirection);

        // Define the character's default forward vector
        let forward = vec3.fromValues(0, 0, 1);

        // Compute the rotation quaternion to align the forward vector with the target direction
        let targetRotation = quat.create();
        quat.rotationTo(targetRotation, forward, targetDirection);

        // Smoothly interpolate from the current rotation to the target rotation
        quat.slerp(currentRotation, currentRotation, targetRotation, dt * 7);

        // Apply the new rotation to the animated character
        this.animatedCharacter.setRotationWorld(currentRotation);
    }

    onSessionStart() {
        /* Set headObject to eyeLeft if in VR */
        this.headObject = this.eyeLeft || this.headObject || this.object;
    }

    onSessionEnd() {
        /* Set headObject to nonVR headObject if not in VR */
        this.headObject = this.headObject || this.object;
    }

    vrGamepadEvents(dt) {
        const s = this.engine.xrSession;
        if (!s) return;
        for (let i = 0; i < s.inputSources.length; ++i) {
            /* Set Thumbstick Gamepad Controls */
            const leftInput = s.inputSources[0];
            const rightInput = s.inputSources[1];
            const leftGamepad = leftInput.gamepad;
            const rightGamepad = rightInput.gamepad;
            if (!leftGamepad && !rightGamepad) continue;
            const yAxisLeft = leftGamepad.axes[3];
            const yAxisRight = rightGamepad.axes[3];
            const xAxisLeft = leftGamepad.axes[2];
            const xAxisRight = rightGamepad.axes[2];

            /* VR Inputs Listeners */
            this.pressVRRight(xAxisRight, yAxisRight);
            this.pressVRLeft(xAxisLeft, yAxisLeft);
        }
    }

    pressVRRight(inputX, inputY) {
        /* VR Gamepad Inputs [Rotation] */
        /* Rotate Right & Left */
        if (inputX > 0) {
            this.rightRotate = true;
        } else {
            this.rightRotate = false;
        }
        if (inputX < 0) {
            this.leftRotate = true;
        } else {
            this.leftRotate = false;
        }
    }
    pressVRLeft(inputX, inputY) {
        /* VR Gamepad Inputs [Translation] */
        /* Move Forward & Backward */
        if (inputY < 0) {
            this.forwardMove = true;
        } else {
            this.forwardMove = false;
        }
        if (inputY > 0) {
            this.backwardMove = true;
        } else {
            this.backwardMove = false;
        }
    }

    pressKeyboard(input) {
        /* Convert key to lowercase to handle both cases */
        let key = input.key.toLowerCase();

        /* Keyboard Inputs */
        if (key === 'arrowup' || key === 'w') {
            /* Move forward */
            this.forwardMove = true;
            this.lastVerticalDirection = 'forward';
        }
        if (key === 'arrowdown' || key === 's') {
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
        if ((this.jumpActive && key === ' ') || key === 'spacebar') {
            this.jump();
        }
    }
    releaseKeyboard(input) {
        /* Convert key to lowercase to handle both cases */
        let key = input.key.toLowerCase();

        /* Keyboard Inputs */
        if (key === 'arrowup' || key === 'w') {
            /* Stop moving forward */
            this.forwardMove = false;
            this.lastVerticalDirection = null;
        }
        if (key === 'arrowdown' || key === 's') {
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
    }

    async rotatePhysxObjY(obj, rot) {
        /* Snap Rotation */
        this.moveActive = false; /* Disable movement while kinematic is on */
        obj.getComponent('physx').kinematic = true; /* turn kinematic on */
        obj.rotateAxisAngleDegObject([0, 1, 0], rot); /* rotate object on axisY */
        await this.delay(0.04); /* gives time for kinematic to function */
        obj.getComponent('physx').kinematic = false; /* turn kinematic off */
        this.moveActive = true; /* Enable movement again */
    }

    isOnGround0() {
        /* Checking if the player is on the ground based on distance from the ground, using raycast */
        // Position of the player
        const position = vec3.create();
        this.object.getPositionWorld(position);
        //adjust position on Y to go lower
        //position[1] -= 0.5;

        // Direction of the ray (downward -Y)
        const direction = vec3.fromValues(0, -1, 0);

        // Perform the raycast
        // const hit = this.engine.physics.rayCast(
        //     position,
        //     direction,
        //     this.groundCheckDistance
        // );

        const hit = this.object
            .getComponent('raycast-debug')
            .rayCastDebug(position, direction);

        //console.log('hit2: ', hit);

        // Check if anything was hit within the ground check distance (while ignoring self collision)
        for (let i = 0; i < hit.hitCount; ++i) {
            if (
                hit.objects[i].name !== this.object.name &&
                hit.distances[i] < this.groundCheckDistance
            ) {
                // console.log('hit: ', hit.objects[i].name);
                return true; // Ground is detected
            }
        }

        return true; //test
        return false; // No ground detected
    }

    isOnGround() {
        /* Checking if the player is on the ground based on distance from the ground, using raycast */
        // Position of the player
        const position = vec3.create();
        this.object.getPositionWorld(position);

        //adjust position on Y to go lower
        position[1] += 0.85;

        // Direction of the ray (downward -Y)
        const direction = vec3.fromValues(0, -1, 0);

        // Perform the raycast
        const hit = this.engine.physics.rayCast(
            position,
            direction,
            1 << 0, // Group mask
            this.groundCheckDistance // Distance
        );
        let hitPoint = null;
        let hitSomething = false;

        // Filter out self hits and check if anything was hit within the ground check distance
        for (let i = 0; i < hit.hitCount; ++i) {
            if (
                hit.objects[i].name !== this.object.name &&
                hit.distances[i] < this.groundCheckDistance
            ) {
                // console.log('hit: ', hit.objects[i].name);
                hitSomething = true;
                hitPoint = hit.locations[i];
                break;
            }
        }

        /* Visualize the raycast */
        const drawLineComp = this.object.getComponent('draw-line');
        if (drawLineComp && this.debugRaycast) {
            if (hitSomething) {
                drawLineComp.drawLine(position, hitPoint, true, 1, [0, 1, 0, 1]);
            } else {
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
        /* Apply a vertical force upwards, if the player is on the ground */
        if (this.jumpActive && this.isOnGround()) {
            /* Apply force */
            const currentVelocity = this.physx.getLinearVelocity(vec3.create());
            currentVelocity[1] = this.jumpForce; // replace vertical component only
            this.physx.linearVelocity = currentVelocity; // Apply the new vertical velocity "Jump"

            /* Jump animation */
            console.log('jump started');
            this.isJumping = true;
            if (this.isAiming || this.isFiring) {
                this.animController?.setAnimation('aimJump'); // Set aim jump animation
            } else {
                this.animController?.setAnimation('jump'); // Set default jump animation
            }
        }
    }

    handleJumpAnimation() {
        /* Check if the player is currently jumping */
        if (!this.isJumping) return;

        /* Check if the player is on the ground */
        if (this.isOnGround()) {
            /* Reset jumping state */
            this.isJumping = false;
        }
    }

    handleFalling(dt) {
        const isAirborne = !this.isOnGround();

        // 🪂 Apply downward force
        if (isAirborne) {
            this.physx.addForce([0, -this.fallingBoost * dt, 0]);
        }

        // 🎬 Play falling animation if not already jumping
        if (isAirborne && !this.isJumping) {
            this.isJumping = true;

            if (this.isAiming || this.isFiring) {
                this.animController?.setAnimation('aimJump'); // Set aim jump animation
            } else {
                this.animController?.setAnimation('jump'); // Set default jump animation
            }
        }
    }
}
