import {Component, LockAxis, Property} from '@wonderlandengine/api';
import {vec3, quat} from 'gl-matrix';

/**
 * wasd-controls-fps
 * Movement with Physx.
 * Component version: 1.0
 *
 * Enable Physx in project settings, & add plane physx floor for the player to move on.
 * Then just add this component to your player, and you'll be able to move your player with Physx Capsule.
 * Adjust the properties to your needs.
 * Controllers works for both VR & Desktop web browsers, you can more controllers if needed.
 */
export class WasdControlsFps extends Component {
    static TypeName = 'wasd-controls-fps';
    static Properties = {
        /* Object of which the orientation is used to determine forward direction if you want to move according to camera */
        headObject: Property.object(), //Usually 'NonVRCamera'
        eyeLeft: Property.object(), //'eyeLeft' for VR

        /* Movement */
        moveActive: Property.bool(true),
        moveSpeed: Property.float(13),
        sprintActive: Property.bool(true),
        sprintSpeed: Property.float(18),

        /* Jump */
        jumpActive: Property.bool(true),
        jumpForce: Property.float(500),
        groundCheckDistance: Property.float(1), //Checking if the player is on the ground based on distance from the ground, adjust this if jumping on air or can't jump

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

        /* Character Animation */
        animatedCharacter: Property.object(), //The character that has animations, should be a child of the player
        animIdle: Property.animation(),
        animWalk: Property.animation(),
        animRun: Property.animation(),
        animJumpStart: Property.animation(),
        animJumpLoop: Property.animation(),
        animJumpEnd: Property.animation(),
    };

    async delay(seconds) {
        return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    }

    init() {
        this.forwardMove = false;
        this.rightMove = false;
        this.backwardMove = false;
        this.leftMove = false;
        this.rightRotate = false;
        this.leftRotate = false;
    }

    start() {
        /* General */
        this.moveSpeedDefault = this.moveSpeed;
        this.isMoving = false; // Track whether the character is moving
        this.isJumping = false; // Track whether the character is jumping
        this.timeSinceLastRaycast = 0;

        /* Create 'Physx' Component */
        this.createPhysxComponent();

        /* Set headObject */
        this.headObject = this.headObject || this.object;
        this.engine.onXRSessionStart.add(this.onSessionStart);
        this.engine.onXRSessionEnd.add(this.onSessionEnd);

        /* Set Keyboard Inputs Listeners */
        window.addEventListener('keydown', this.pressKeyboard.bind(this));
        window.addEventListener('keyup', this.releaseKeyboard.bind(this));

        /* Animation */
        this.playAnimation('idle');
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

        /* Handle jump animation in animatedCharacter */
        //console.log('isOnGround: ', this.isOnGround());
        //this.handleJumpAnimation();
    }

    createPhysxComponent() {
        /* Create 'Physx' Component */
        // Rotation from Euler to Quat
        this.rotOffsetPhysxQuat = [0, 0, 0, 0];
        quat.fromEuler(
            this.rotOffsetPhysxQuat,
            this.rotOffsetPhysx[0],
            this.rotOffsetPhysx[1],
            this.rotOffsetPhysx[2]
        );

        // Determine the appropriate angular lock based on the smoothRotation setting
        let angularLockAxis = LockAxis.X | LockAxis.Z; // Default lock all angularAxis except for Y
        if (!this.smoothRotation) {
            angularLockAxis |= LockAxis.Y; // Lock Y as well if smooth rotation is disabled, to prevent rotation on colliding with other objects
        }

        // Physx options
        this.object.addComponent('physx', {
            shape: 2, // Capsule
            extents: [this.radiusPhysx, this.capsuleHeightPhysx, 1],
            translationOffset: this.translationOffsetPhysx,
            rotationOffset: this.rotOffsetPhysxQuat,
            gravity: true,
            kinematic: false,
            linearDamping: this.linearDampingPhysx,
            angularDamping: this.angularDampingPhysx,
            angularLockAxis: angularLockAxis,
            bounciness: 0.25,
        });
    }

    moveUpdate(dt) {
        /* Calculate direction */
        this.headForward = [0, 0, 0];
        let direction = [0, 0, 0];
        if (this.forwardMove) direction[2] -= 1.0;
        if (this.backwardMove) direction[2] += 1.0;
        if (this.leftMove) direction[0] -= 1.0;
        if (this.rightMove) direction[0] += 1.0;

        /* Normalize direction */
        vec3.normalize(direction, direction);
        direction[0] *= this.moveSpeed;
        direction[2] *= this.moveSpeed;
        /* Move according to headObject Forward Direction */
        this.headObject.getForwardWorld(this.headForward);
        /* Combine direction with headObject */
        vec3.transformQuat(direction, direction, this.headObject.getTransformWorld());

        /* Move via velocity Physx */
        if (this.moveActive) {
            if (this.forwardMove || this.backwardMove || this.leftMove || this.rightMove) {
                direction[1] = 0; /* Not to move on Y axis */
                //this.object.getComponent('physx').linearVelocity = direction; /* Move, with linearVelocity */
                this.object
                    .getComponent('physx')
                    .addForce(direction); /* Move, with force */

                /* Rotate the animated character to face the direction of movement */
                this.rotateAnimatedCharacter(direction, dt);
            }
        }

        /* Check if there's any movement */
        const isCurrentlyMoving = vec3.length(direction) > 0;

        /* Trigger animations based on movement state */
        if (isCurrentlyMoving && !this.isMoving && !this.isJumping) {
            // Start walking animation
            this.playAnimation('walk');
            this.isMoving = true;
        } else if (!isCurrentlyMoving && this.isMoving && !this.isJumping) {
            // Start idle animation
            this.playAnimation('idle');
            this.isMoving = false;
        }
    }

    smoothRotUpdate() {
        /* Smooth rotation via Velocity Physx */
        if (this.smoothRotation) {
            if (this.rightRotate) {
                this.object.getComponent('physx').angularVelocity = [
                    0,
                    -this.smoothRotationSpeed,
                    0,
                ];
            }
            if (this.leftRotate) {
                this.object.getComponent('physx').angularVelocity = [
                    0,
                    this.smoothRotationSpeed,
                    0,
                ];
            }
        }
    }

    rotateAnimatedCharacter(direction, dt) {
        /* Rotate the Animated Character to face the direction of movement */
        /* This doesn't rotate the physx capsule */
        /* If the rotation doesn't work while the character is playing animation,
         * then make sure to create an empty parent as the animated character instead, and add to it the 'animation' component
         */

        // Don't play animatioans if there's no animated character
        if (this.animatedCharacter == null) return;

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
        } else if (key === 'arrowdown' || key === 's') {
            /* Move backward */
            this.backwardMove = true;
        } else if (key === 'arrowright' || key === 'd') {
            if (this.smoothRotation) {
                /* Rotate right */
                this.rightRotate = true;
            } else if (this.snapRotation) {
                this.rotatePhysxObjY(this.object, -this.snapRotationDegrees);
            } else {
                /* Move right */
                this.rightMove = true;
            }
        } else if (key === 'arrowreft' || key === 'a') {
            if (this.smoothRotation) {
                /* Rotate left */
                this.leftRotate = true;
            } else if (this.snapRotation) {
                this.rotatePhysxObjY(this.object, this.snapRotationDegrees);
            } else {
                /* Move left */
                this.leftMove = true;
            }
        }

        /* Sprint start */
        if (key === 'shift') {
            this.moveSpeed = this.sprintSpeed;
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
        } else if (key === 'arrowdown' || key === 's') {
            /* Stop moving backward */
            this.backwardMove = false;
        } else if (key === 'arrowright' || key === 'd') {
            if (this.smoothRotation) {
                /* Stop rotating right */
                this.rightRotate = false;
            } else {
                /* Stop moving right */
                this.rightMove = false;
            }
        } else if (key === 'arrowleft' || key === 'a') {
            if (this.smoothRotation) {
                /* Stop rotating left */
                this.leftRotate = false;
            } else {
                /* Stop moving left */
                this.leftMove = false;
            }
        }

        /* Sprint end */
        if (key === 'shift') {
            this.moveSpeed = this.moveSpeedDefault;
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
                console.log('hit: ', hit.objects[i].name);
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
        position[1] += 0.25;
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
                console.log('hit: ', hit.objects[i].name);
                hitSomething = true;
                hitPoint = hit.locations[i];
                break;
            }
        }
        // Visualize the raycast
        const drawLineComp = this.object.getComponent('draw-line');
        if (drawLineComp) {
            if (hitSomething) {
                drawLineComp.drawLine(position, hitPoint);
            } else {
                const endPoint = [
                    position[0] + direction[0] * this.groundCheckDistance,
                    position[1] + direction[1] * this.groundCheckDistance,
                    position[2] + direction[2] * this.groundCheckDistance,
                ];
                drawLineComp.drawLine(position, endPoint);
            }
        }
        return hitSomething;
    }

    handleJumpAnimation() {
        if (this.isJumping) {
            if (this.isOnGround()) {
                this.playAnimation('jump-end');
                this.isJumping = false;
            }
        }
    }

    jump() {
        /* Apply a vertical force upwards, if the player is on the ground */
        if (this.jumpActive && this.isOnGround()) {
            this.object.getComponent('physx').addForce([0, this.jumpForce, 0]);
        }

        /* Animation */
        this.isJumping = true;
        this.playAnimation('jump-start');
    }

    playAnimation(currentState) {
        // /* Don't play animatioans if there's no animated character */
        // if (this.animatedCharacter == null) return;
        // /* Don't play the same animation twice */
        // if (this.currentAnimation == currentState) return;
        // console.log(currentState);
        // /* Reset current animation to ensure it doesn't hold onto an old animation */
        // this.animatedCharacter.getComponent('animation').animation = null;
        // /* Set the animation based on the current state */
        // /* You can add more states and animations here based on your needs */
        // switch (currentState) {
        //     case 'idle':
        //         if (this.animIdle) {
        //             this.animatedCharacter.getComponent('animation').animation =
        //                 this.animIdle; // Set the animation
        //             this.animatedCharacter.getComponent('animation').playCount = 0; // Loop
        //             this.animatedCharacter.getComponent('animation').speed = 1; // adjust animation speed
        //         }
        //         break;
        //     case 'walk':
        //         if (this.animWalk) {
        //             this.animatedCharacter.getComponent('animation').animation =
        //                 this.animWalk; // Set the animation
        //             this.animatedCharacter.getComponent('animation').playCount = 0; // Loop
        //             this.animatedCharacter.getComponent('animation').speed = 1; // adjust animation speed
        //         }
        //         break;
        //     case 'run':
        //         if (this.animRun) {
        //             this.animatedCharacter.getComponent('animation').animation =
        //                 this.animRun; // Set the animation
        //             this.animatedCharacter.getComponent('animation').playCount = 0; // Loop
        //             this.animatedCharacter.getComponent('animation').speed = 1; // adjust animation speed
        //         }
        //         break;
        //     case 'jump-start':
        //         if (this.animJumpStart) {
        //             this.animatedCharacter.getComponent('animation').animation =
        //                 this.animJumpStart; // Set the animation
        //             this.animatedCharacter.getComponent('animation').playCount = 1; // Play once
        //             this.animatedCharacter.getComponent('animation').speed = 1; // adjust animation speed
        //         }
        //         break;
        //     case 'jump-loop':
        //         if (this.animJumpLoop) {
        //             this.animatedCharacter.getComponent('animation').animation =
        //                 this.animJumpLoop; // Set the animation
        //             this.animatedCharacter.getComponent('animation').playCount = 0; // Loop
        //             this.animatedCharacter.getComponent('animation').speed = 1; // adjust animation speed
        //         }
        //         break;
        //     case 'jump-end':
        //         if (this.animJumpEnd) {
        //             this.animatedCharacter.getComponent('animation').animation =
        //                 this.animJumpEnd; // Set the animation
        //             this.animatedCharacter.getComponent('animation').playCount = 1; // Play once
        //             this.animatedCharacter.getComponent('animation').speed = 1; // adjust animation speed
        //         }
        //         break;
        // }
        // /* Play Animation */
        // if (this.animatedCharacter.getComponent('animation').animation != null) {
        //     this.animatedCharacter.getComponent('animation').play();
        //     this.currentAnimation = currentState; // Set the current animation for the double animation gate
        //     console.log('play animation');
        // } else {
        //     console.error('Attempted to play a null animation for state:', currentState);
        // }
    }
}
