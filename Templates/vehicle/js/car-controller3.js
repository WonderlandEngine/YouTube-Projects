import {Component, Property} from '@wonderlandengine/api';
import {vec3, quat} from 'gl-matrix';

/**
 * car-controller3
 */
export class CarController3 extends Component {
    static TypeName = 'car-controller3';
    /* Properties that are configurable in the editor */
    static Properties = {
        body: Property.object(),
        wheelFL: Property.object(),
        wheelFR: Property.object(),
        wheelBL: Property.object(),
        wheelBR: Property.object(),

        acceleration: Property.float(5),
        maxSpeed: Property.float(25), // #
        turnSpeed: Property.float(30), // degrees per second
        gravity: Property.float(9.81), // #
        wheelGravity: Property.float(2.0), // Force applied to wheels, to give the car weight and stabilize it against flipping over
        groundY: Property.float(1), // Simulate a flat ground // #
        wheelRadius: Property.float(0.3), // Radius of the wheels for ground contact
        suspensionHeight: Property.float(0.4), // Distance from wheel center to car body
        maxSuspensionOffset: Property.float(2.1), // Max vertical wheel travel

        // Steering visual
        maxSteerAngle: Property.float(35), // Max steering angle in degrees
        steerSpeed: Property.float(2), // Speed of steering rotation
    };

    start() {
        /* Initialize variables */
        this.speed = 0;
        this.velocity = [0, 0, 0];
        this.forwardKey = false;
        this.backwardKey = false;
        this.leftKey = false;
        this.rightKey = false;
        this.isGrounded = false;
        this.verticalVelocity = 0; // vertical motion from gravity or jump

        /* get draw-line component */
        this.drawLineComp = this.body.getComponent('draw-line');

        /* get the car's body physx component */
        this.bodyPhysics = this.body.getComponent('physx');

        /* per-wheel offsets */
        this.wheelOffsets = {
            FL: 0,
            FR: 0,
            BL: 0,
            BR: 0,
        };

        this.originalWheelOffsets = {
            [this.wheelFL?.name]: this.wheelFL?.getPositionLocal()[1] ?? 0,
            [this.wheelFR?.name]: this.wheelFR?.getPositionLocal()[1] ?? 0,
            [this.wheelBL?.name]: this.wheelBL?.getPositionLocal()[1] ?? 0,
            [this.wheelBR?.name]: this.wheelBR?.getPositionLocal()[1] ?? 0,
        };

        /* Store wheel ground contact data for smarter rotation */
        this.wheelHitNormals = {};
        this.wheelHitPoints = {};

        /* key input */
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    onKeyDown(e) {
        const k = e.key.toLowerCase();
        if (k === 'w') this.forwardKey = true;
        if (k === 's') this.backwardKey = true;
        if (k === 'a') this.leftKey = true;
        if (k === 'd') this.rightKey = true;

        if (k === 'x') {
            // this.object.getComponent('physx').addForce([0, 100, 0]);
        }
    }

    onKeyUp(e) {
        const k = e.key.toLowerCase();
        if (k === 'w') this.forwardKey = false;
        if (k === 's') this.backwardKey = false;
        if (k === 'a') this.leftKey = false;
        if (k === 'd') this.rightKey = false;
    }

    /* logic */
    update(dt) {
        // Handle movement input and apply translation
        this.handleMovement(dt);

        // Apply suspension forces from each wheel to simulate hover
        this.applySuspensionForces(dt);

        // Update steering visual
        this.updateSteeringVisual(dt);

        // Spin the wheels for visual effect
        this.updateWheelSpinningVisual(dt);
    }

    applySuspensionForces(dt) {
        const traceLength = this.suspensionHeight + this.wheelRadius; // how far we check for ground contact
        const hoverForce = 100; // max suspension force (tweak it)

        const wheels = [this.wheelFL, this.wheelFR, this.wheelBL, this.wheelBR];

        /* First Pass: Collect all wheel groundY data */
        const wheelHits = [];

        for (const wheel of wheels) {
            if (!wheel) continue;

            const wheelPos = [0, 0, 0];
            const wheelUp = [0, 1, 0];

            // Get world position & up direction of wheel
            wheel.getPositionWorld(wheelPos);
            this.body.getUpWorld(wheelUp); // use world up vector, using body's up vector instead of wheel as wheels can be rotated
            vec3.normalize(wheelUp, wheelUp); // just in case

            // Flip up to point down for ray direction
            const rayDir = [-wheelUp[0], -wheelUp[1], -wheelUp[2]];
            const rayStart = [
                wheelPos[0] + wheelUp[0] * 0.2,
                wheelPos[1] + wheelUp[1] * 0.2,
                wheelPos[2] + wheelUp[2] * 0.2,
            ];

            // Exclude the self car from the raycast (layer 4)
            const hit = this.engine.physics.rayCast(
                rayStart,
                rayDir,
                ~(1 << 4),
                traceLength
            );

            if (hit.hitCount > 0) {
                const hitPos = hit.locations[0];

                wheelHits.push({
                    wheel,
                    wheelName: wheel.name,
                    wheelPos: [...wheelPos],
                    wheelUp: [...wheelUp],
                    hitPos: [...hitPos],
                    groundY: hitPos[1],
                    rayStart,
                    rayDir,
                });
            } else if (this.drawLineComp) {
                // Wheel is airborne – reset visual compression toward original Y
                const currentLocal = wheel.getPositionLocal();
                const targetY = this.originalWheelOffsets?.[wheel.name] ?? currentLocal[1];
                const newY = currentLocal[1] + (targetY - currentLocal[1]) * dt * 10;

                wheel.setPositionLocal([currentLocal[0], newY, currentLocal[2]]);

                // 🧲 Apply gravity pull per ungrounded wheel to give the car weight (makes car tilt toward hanging wheels, & stabilize it against flipping over)
                const gravityForce = [0, -this.wheelGravity * dt, 0];
                this.bodyPhysics.addForce(gravityForce, undefined, false, wheelPos);

                // Draw debug line in red
                if (this.drawLineComp) {
                    const end = [
                        rayStart[0] + rayDir[0] * traceLength,
                        rayStart[1] + rayDir[1] * traceLength,
                        rayStart[2] + rayDir[2] * traceLength,
                    ];
                    this.drawLineComp.drawLine(rayStart, end, true, 1, [1, 0, 0, 1]);
                }
            }
        }

        // Average ground height from all grounded wheels
        if (wheelHits.length === 0) return;
        const avgGroundY =
            wheelHits.reduce((sum, h) => sum + h.groundY, 0) / wheelHits.length;

        for (const hitData of wheelHits) {
            const {wheel, wheelName, wheelPos, wheelUp, hitPos, groundY, rayStart, rayDir} =
                hitData;

            const hitNormal = [0, 1, 0]; // use upward normal
            const toHit = [
                hitPos[0] - wheelPos[0],
                hitPos[1] - wheelPos[1],
                hitPos[2] - wheelPos[2],
            ];
            const distance = vec3.length(toHit);

            // Lerp Alpha based on compression
            const alpha = 1 - Math.min(distance / traceLength, 1);

            // Interpolated force
            const forceStrength = hoverForce * alpha;

            // Final force along the ground normal
            const finalForce = [
                hitNormal[0] * forceStrength * dt,
                hitNormal[1] * forceStrength * dt - 0.4, // To fix the car jittering up and down
                hitNormal[2] * forceStrength * dt,
            ];

            // Add fake damping based on velocity toward the surface
            if (alpha > 0.001) {
                const velocity = [0, 0, 0];
                this.bodyPhysics.getLinearVelocity(velocity);

                const normalVelocity = vec3.dot(velocity, hitNormal); // movement along surface normal

                // Only damp when moving toward surface (compressing)
                if (normalVelocity < 0) {
                    const dampingStrength = 40; // 💡 You can tweak this
                    const dampingForce = -normalVelocity * dampingStrength;

                    finalForce[0] += hitNormal[0] * dampingForce * dt;
                    finalForce[1] += hitNormal[1] * dampingForce * dt;
                    finalForce[2] += hitNormal[2] * dampingForce * dt;
                }
            }

            // Apply to the body
            this.bodyPhysics.addForce(finalForce, undefined, false, wheelPos, false);

            // ============================
            // 🛞 VISUAL WHEEL COMPRESSION
            // ============================
            const heightDiff = groundY - avgGroundY; // if > 0, it's on a bump
            const maxVisualOffset = this.maxSuspensionOffset; // max visual offset upward
            const bumpStrength = Math.min(heightDiff / traceLength, 1);
            const visualCompression = heightDiff > 0 ? bumpStrength * maxVisualOffset : 0;

            // Smooth the wheel Y-position visually
            const currentLocal = wheel.getPositionLocal();
            const targetY = this.originalWheelOffsets?.[wheelName] ?? currentLocal[1]; // fallback if not set
            const newY =
                currentLocal[1] + (targetY + visualCompression - currentLocal[1]) * dt * 15;

            // Apply the local Y offset
            wheel.setPositionLocal([currentLocal[0], newY, currentLocal[2]]);

            // Debug line
            if (this.drawLineComp) {
                const end = [
                    rayStart[0] + rayDir[0] * traceLength,
                    rayStart[1] + rayDir[1] * traceLength,
                    rayStart[2] + rayDir[2] * traceLength,
                ];
                this.drawLineComp.drawLine(rayStart, hitPos, true, 1, [0, 1, 0, 1]);
            }
        }
    }

    /* PhysX Car Movement Control (Apply forward force + turning torque) */
    handleMovement(dt) {
        // Get car's forward direction
        const forward = [0, 0, 0];
        this.body.getForwardWorld(forward);

        // ================
        // Forward force
        // ================
        const force = [0, 0, 0];
        if (this.forwardKey) {
            force[0] += forward[0] * this.acceleration;
            force[2] += forward[2] * this.acceleration;
        }
        if (this.backwardKey) {
            force[0] -= forward[0] * this.acceleration;
            force[2] -= forward[2] * this.acceleration;
        }

        // Apply forward/backward force
        if (force[0] !== 0 || force[2] !== 0) {
            this.bodyPhysics.addForce(force);
        }

        // ================
        // Steering torque
        // ================
        const isReversing = this.backwardKey && !this.forwardKey;
        const turnMultiplier = isReversing ? -1 : 1; // if reversing, turn the other way
        
        // Get horizontal movement speed
        const velocity = [0, 0, 0];
        this.bodyPhysics.getLinearVelocity(velocity);
        const horizontalSpeed = Math.sqrt(velocity[0] ** 2 + velocity[2] ** 2);
        
        // Only steer if moving
        if (horizontalSpeed > 1.0) {
            if (this.leftKey) {
                this.bodyPhysics.addTorque([0, this.turnSpeed * dt * turnMultiplier, 0]);
            } else if (this.rightKey) {
                this.bodyPhysics.addTorque([0, -this.turnSpeed * dt * turnMultiplier, 0]);
            }
        }

        // ======================
        // Custom Linear Damping
        // ======================
        const damping = 2; // tweak: higher = more frictiony tires
        const dampedVelocity = [
            velocity[0] * (1 - damping * dt),
            velocity[1], // keep Y velocity for suspension/gravity
            velocity[2] * (1 - damping * dt),
        ];
        this.object.getComponent('physx').linearVelocity = dampedVelocity;
    }

    /* Rotate front wheels for steering visual */
    updateSteeringVisual(dt) {
        // Target angle based on key press
        let targetAngle = 0;
        if (this.leftKey) targetAngle = this.maxSteerAngle;
        else if (this.rightKey) targetAngle = -this.maxSteerAngle;

        //  Front wheels only
        const frontWheels = [this.wheelFL, this.wheelFR];

        for (const wheel of frontWheels) {
            if (!wheel) continue;

            // Get current local rotation
            const currentRot = quat.create();
            wheel.getRotationLocal(currentRot);

            // Convert to Euler
            const euler = this.quatToEulerAngles(currentRot).map(
                (r) => r * (180 / Math.PI)
            );

            // Lerp current Y rotation toward target
            const newY = this.lerp(euler[1], targetAngle, dt * this.steerSpeed); // smoothness

            // Keep other axes untouched
            const newQuat = quat.create();
            quat.fromEuler(newQuat, euler[0], newY, euler[2]);

            wheel.setRotationLocal(newQuat);
        }
    }

    /* Spin all wheels visually based on car speed */
    updateWheelSpinningVisual(dt) {
        const wheels = [this.wheelFL, this.wheelFR, this.wheelBL, this.wheelBR];

        // Get forward velocity
        const velocity = [0, 0, 0];
        this.bodyPhysics.getLinearVelocity(velocity);

        const forward = [0, 0, 0];
        this.body.getForwardWorld(forward);

        // Project velocity onto forward to get directional speed
        const forwardSpeed = vec3.dot(velocity, forward);

        // Spin amount
        const spinSpeed = -forwardSpeed * 100 * dt; // tweak factor

        for (const wheel of wheels) {
            if (!wheel || Math.abs(spinSpeed) < 0.01) continue;

            // Local X rotation (forward roll)
            wheel.rotateAxisAngleDegObject([1, 0, 0], spinSpeed);
        }
    }

    /* Linear Interpolation Helper */
    lerp(a, b, t) {
        return a + (b - a) * Math.min(t, 1);
    }

    /* Convert quaternion to Euler angles */
    quatToEulerAngles(quat) {
        const sqw = quat[3] * quat[3];
        const sqx = quat[0] * quat[0];
        const sqy = quat[1] * quat[1];
        const sqz = quat[2] * quat[2];
        const unit = sqx + sqy + sqz + sqw; // if normalised is one, otherwise is correction factor
        const test = quat[0] * quat[1] + quat[2] * quat[3];
        let pitch;
        let yaw;
        let roll;
        if (test > 0.499 * unit) {
            // singularity at north pole
            yaw = 2 * Math.atan2(quat[0], quat[3]);
            roll = Math.PI / 2;
            pitch = 0;
        } else if (test < -0.499 * unit) {
            // singularity at south pole
            yaw = -2 * Math.atan2(quat[0], quat[3]);
            roll = -Math.PI / 2;
            pitch = 0;
        } else {
            yaw = Math.atan2(
                2 * quat[1] * quat[3] - 2 * quat[0] * quat[2],
                sqx - sqy - sqz + sqw
            );
            roll = Math.asin((2 * test) / unit);
            pitch = Math.atan2(
                2 * quat[0] * quat[3] - 2 * quat[1] * quat[2],
                -sqx + sqy - sqz + sqw
            );
        }
        return [pitch, yaw, roll];
    }
}
