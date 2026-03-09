import {Component, Property} from '@wonderlandengine/api';
import {vec3, quat} from 'gl-matrix';

/**
 * car-controller2
 */
export class CarController2 extends Component {
    static TypeName = 'car-controller2';
    /* Properties that are configurable in the editor */
    static Properties = {
        body: Property.object(),
        wheelFL: Property.object(),
        wheelFR: Property.object(),
        wheelBL: Property.object(),
        wheelBR: Property.object(),

        acceleration: Property.float(8),
        maxSpeed: Property.float(25),
        turnSpeed: Property.float(180), // degrees per second
        gravity: Property.float(9.81),
        groundY: Property.float(1), // Simulate a flat ground
        wheelRadius: Property.float(0.3), // Radius of the wheels for ground contact
        suspensionHeight: Property.float(1.0), // Distance from wheel center to car body
        maxSuspensionOffset: Property.float(0.1), // 💥 Max vertical wheel travel
        wheelbase: Property.float(2.0), // Distance between front and back wheels
        trackWidth: Property.float(1.5), // Distance between left and right wheels
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
        this.verticalVelocity = 0; // 🌪️ vertical motion from gravity or jump

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

        /* Store wheel ground contact data for smarter rotation */
        this.wheelHitNormals = {};
        this.wheelHitPoints = {};

        /* key input */
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    /* logic */
    update(dt) {
        // Handle movement input and apply translation
        this.handlePlayerMovement(dt);

        // Apply suspension forces from each wheel to simulate hover
        this.applySuspensionForces(dt);

        // Apply gravity if all wheels are airborne
        this.applyGravityIfAirborne(dt);

        // Spin the wheels for visual effect
        this.spinWheels(dt);
    }

    /* 🛠️ Apply hover-style suspension force from each wheel to the car body */
    applySuspensionForces(dt) {
        const maxExtension = this.suspensionHeight + this.wheelRadius;
        const wheels = [
            {obj: this.wheelFL, key: 'FL', offset: [-1, 0, 1]},
            {obj: this.wheelFR, key: 'FR', offset: [1, 0, 1]},
            {obj: this.wheelBL, key: 'BL', offset: [-1, 0, -1]},
            {obj: this.wheelBR, key: 'BR', offset: [1, 0, -1]},
        ];

        const currentPos = [0, 0, 0];
        this.body.getPositionWorld(currentPos);

        let suspensionPoints = [];

        for (const wheel of wheels) {
            if (!wheel.obj) continue;

            const wheelPos = [0, 0, 0];
            wheel.obj.getPositionWorld(wheelPos);

            const rayStart = [wheelPos[0], wheelPos[1] + 0.2, wheelPos[2]];
            const rayDir = [0, -1, 0];
            const hit = this.engine.physics.rayCast(rayStart, rayDir, 1 << 0, maxExtension);

            let hitY = null;
            for (let i = 0; i < hit.hitCount; i++) {
                const dist = hit.distances[i];
                if (dist < maxExtension) {
                    hitY = rayStart[1] - dist;
                    break;
                }
            }

            // Draw debug line
            if (this.drawLineComp) {
                const end =
                    hitY !== null
                        ? [rayStart[0], hitY, rayStart[2]]
                        : [rayStart[0], rayStart[1] - maxExtension, rayStart[2]];

                this.drawLineComp.drawLine(
                    rayStart,
                    end,
                    hitY !== null,
                    1,
                    hitY ? [0, 1, 0, 1] : [1, 0, 0, 1]
                );
            }

            if (hitY !== null) {
                const desiredWheelY = hitY + this.suspensionHeight;
                suspensionPoints.push(desiredWheelY);
            }
        }

        if (suspensionPoints.length === 4) {
            // Per-wheel: average front/back & left/right for X/Z tilt
            const [FL, FR, BL, BR] = suspensionPoints;

            const frontAvg = (FL + FR) / 2;
            const backAvg = (BL + BR) / 2;
            const leftAvg = (FL + BL) / 2;
            const rightAvg = (FR + BR) / 2;

            const pitch = Math.atan2(frontAvg - backAvg, this.wheelbase);
            const roll = Math.atan2(leftAvg - rightAvg, this.trackWidth);

            const targetY = (FL + FR + BL + BR) / 4;

            // Smooth Y position
            const smoothing = 10;
            const newY = currentPos[1] + (targetY - currentPos[1]) * dt * smoothing;

            this.body.setPositionWorld([currentPos[0], newY, currentPos[2]]);

            // Apply tilt from suspension
            const currentRot = quat.create();
            this.body.getRotationWorld(currentRot);

            const [, yaw] = this.quatToEulerAngles(currentRot);
            const q = quat.create();
            quat.fromEuler(
                q,
                (pitch * 180) / Math.PI,
                (yaw * 180) / Math.PI,
                (roll * 180) / Math.PI
            );
            this.body.setRotationWorld(q);
        }
    }

    /* 🕹️ Apply player input movement (WASD) to car velocity */
    handlePlayerMovement(dt) {
        // =========================
        // 🔧 Movement Config
        // =========================
        const speedAccel = this.acceleration;
        const speedDecay = 0.95;

        // 🧭 Handle speed forward/back
        if (this.forwardKey) this.speed += speedAccel * dt;
        else if (this.backwardKey) this.speed -= speedAccel * dt;
        else this.speed *= speedDecay;

        // Clamp max speed
        this.speed = Math.max(-this.maxSpeed, Math.min(this.speed, this.maxSpeed));

        // 🔄 Handle turning (WASD)
        const absSpeed = Math.abs(this.speed);
        if (absSpeed > 0.1) {
            const turnDir = this.speed > 0 ? 1 : -1;
            const speedFactor = Math.min(absSpeed / this.maxSpeed, 1.0);
            const turnAmount = this.turnSpeed * dt * speedFactor * turnDir;

            if (this.leftKey) this.body.rotateAxisAngleDegObject([0, 1, 0], turnAmount);
            else if (this.rightKey)
                this.body.rotateAxisAngleDegObject([0, 1, 0], -turnAmount);
        }

        // 🚗 Apply movement vector
        const forward = [0, 0, 0];
        this.body.getForwardWorld(forward);
        this.velocity[0] = forward[0] * this.speed * dt;
        this.velocity[2] = forward[2] * this.speed * dt;

        this.body.translate(this.velocity);
    }

    /* Apply gravity to the car body if all wheels are airborne */
    applyGravityIfAirborne(dt) {
        const gravityAccel = this.gravity;
        const maxRayDist = this.suspensionHeight + this.wheelRadius;

        const wheels = [
            {obj: this.wheelFL, grounded: false},
            {obj: this.wheelFR, grounded: false},
            {obj: this.wheelBL, grounded: false},
            {obj: this.wheelBR, grounded: false},
        ];

        let groundedCount = 0;

        for (const wheel of wheels) {
            if (!wheel.obj) continue;

            const pos = [0, 0, 0];
            wheel.obj.getPositionWorld(pos);

            const rayStart = [pos[0], pos[1] + 0.2, pos[2]];
            const rayDir = [0, -1, 0];

            const hit = this.engine.physics.rayCast(rayStart, rayDir, 1 << 0, maxRayDist);
            if (hit.hitCount > 0) {
                wheel.grounded = true;
                groundedCount++;
            }
        }

        const allGrounded = groundedCount === 4;
        const anyAirborne = groundedCount < 4;

        if (anyAirborne) {
            // Apply gravity acceleration
            this.verticalVelocity -= gravityAccel * dt;

            // Move car down by velocity
            this.body.translate([0, this.verticalVelocity * dt, 0]);
        } else {
            // Smooth vertical velocity stop when fully grounded
            this.verticalVelocity = 0;
        }

        // Optional: Add small tilt toward ungrounded wheels while airborne
        if (anyAirborne) {
            const frontLeft = wheels[0].grounded ? 0 : 1;
            const frontRight = wheels[1].grounded ? 0 : 1;
            const backLeft = wheels[2].grounded ? 0 : 1;
            const backRight = wheels[3].grounded ? 0 : 1;

            const roll = frontRight + backRight - (frontLeft + backLeft); // Z-axis
            const pitch = backLeft + backRight - (frontLeft + frontRight); // X-axis

            const tiltAmount = 0.5 * dt;
            const currentRot = quat.create();
            this.body.getRotationWorld(currentRot);
            const euler = this.quatToEulerAngles(currentRot);
            quat.fromEuler(
                currentRot,
                (euler[0] * 180) / Math.PI + pitch * tiltAmount,
                (euler[1] * 180) / Math.PI,
                (euler[2] * 180) / Math.PI + roll * tiltAmount
            );
            this.body.setRotationWorld(currentRot);
        }
    }

    //=================================================================================================//
    //=================================================================================================//
    //=================================================================================================//

    /* 🧲 Apply per-wheel gravity pull if a wheel is NOT grounded */
    applyWheelBasedGravity(dt) {
        const wheels = ['FL', 'FR', 'BL', 'BR'];

        for (const key of wheels) {
            if (!this.wheelHitPoints[key]) {
                // 🚨 Wheel is not grounded — apply gravity
                this.verticalVelocity -= this.gravity * dt;
                this.body.translate([0, this.verticalVelocity * dt, 0]);

                // 🧪 Debug log which wheel triggered gravity
                console.log(`💥 Gravity applied due to airborne wheel: ${key}`);
                return;
            }
        }

        // ✅ All wheels grounded — reset vertical velocity
        if (this.verticalVelocity !== 0) {
            console.log(`🛬 Car fully grounded again, resetting vertical velocity.`);
        }
        this.verticalVelocity = 0;
    }

    /* 🚗 Cast ray from each wheel to follow terrain and adjust their vertical offset */
    updateWheelRaycasts(dt) {
        const wheels = [
            {obj: this.wheelFL, key: 'FL'},
            {obj: this.wheelFR, key: 'FR'},
            {obj: this.wheelBL, key: 'BL'},
            {obj: this.wheelBR, key: 'BR'},
        ];

        /* 🚿 Clear previous wheel hits to avoid stale data */
        this.wheelHitPoints = {};
        this.wheelHitNormals = {};

        // Store wheel ground heights for body positioning
        const wheelGroundHeights = {};
        let validWheelCount = 0;

        for (const wheel of wheels) {
            if (!wheel.obj) continue;

            const wheelPos = [0, 0, 0];
            wheel.obj.getPositionWorld(wheelPos);

            // move ray start a bit above wheel
            const rayStart = [wheelPos[0], wheelPos[1] + 0.5, wheelPos[2]];
            const rayDir = [0, -1, 0];
            const rayDist = 1.5;

            const hit = this.engine.physics.rayCast(rayStart, rayDir, 1 << 0, rayDist);

            let hitY = null;
            for (let i = 0; i < hit.hitCount; i++) {
                const dist = hit.distances[i];
                if (dist < rayDist) {
                    // Calculate hit Y position
                    hitY = rayStart[1] - dist;

                    // Store hit data for this wheel
                    this.wheelHitNormals[wheel.key] = hit.normals[i];
                    this.wheelHitPoints[wheel.key] = hit.locations[i];

                    // Break out of loop after finding first hit
                    break;
                }
            }

            // Visualize each ray
            if (this.drawLineComp) {
                const end =
                    hitY !== null
                        ? [rayStart[0], hitY, rayStart[2]]
                        : [rayStart[0], rayStart[1] - rayDist, rayStart[2]];

                this.drawLineComp.drawLine(
                    rayStart,
                    end,
                    !!hitY,
                    1,
                    hitY ? [0, 1, 0, 1] : [1, 0, 0, 1]
                );
            }

            // smooth offset toward target Y
            if (hitY !== null) {
                // Calculate how much the wheel needs to move to touch the ground
                // We want the wheel to be positioned so its bottom touches the ground
                const targetWheelY = hitY + this.wheelRadius; // Position wheel so bottom touches ground
                const currentWheelY = wheelPos[1];
                const targetOffset = targetWheelY - currentWheelY;

                /* 🛑 Limit suspension travel */
                const maxOffset = this.maxSuspensionOffset;
                const clampedOffset = Math.min(targetOffset, maxOffset);

                const smoothing = 10;
                this.wheelOffsets[wheel.key] +=
                    (clampedOffset - this.wheelOffsets[wheel.key]) * dt * smoothing;

                /* 💡 If offset exceeds limit, apply rotation to body instead */
                if (targetOffset > maxOffset) {
                    const tiltAmount = (targetOffset - maxOffset) * 0.8; // how aggressive tilt is
                    const tiltAxis =
                        wheel.key === 'FL' || wheel.key === 'BL' ? [0, 0, -1] : [0, 0, 1]; // left = right tilt, right = left tilt
                    this.body.rotateAxisAngleDegObject(tiltAxis, tiltAmount * dt * 60); // 💃 tilt faster
                }

                // Apply Y offset locally (visual only)
                const localPos = wheel.obj.getPositionLocal();
                wheel.obj.setPositionLocal([
                    localPos[0],
                    localPos[1] + this.wheelOffsets[wheel.key],
                    localPos[2],
                ]);

                // Store the wheel's ground contact height for body positioning
                wheelGroundHeights[wheel.key] = targetWheelY;
                validWheelCount++;
            }
        }

        // Update car body position based on wheel heights
        this.updateCarBodyPosition(wheelGroundHeights, validWheelCount, dt);
    }

    /* 🚗 Update car body position based on wheel ground contact heights */
    updateCarBodyPosition(wheelGroundHeights, validWheelCount, dt) {
        if (validWheelCount === 0) return; // No wheels touching ground

        // Calculate average height of all wheels touching ground
        let totalHeight = 0;
        for (const key in wheelGroundHeights) {
            totalHeight += wheelGroundHeights[key];
        }
        const avgWheelHeight = totalHeight / validWheelCount;

        // Calculate target car body height (wheels + suspension height)
        const targetBodyHeight = avgWheelHeight + this.suspensionHeight;

        // Get current car body position
        const currentPos = [0, 0, 0];
        this.body.getPositionWorld(currentPos);

        // Safety check to prevent NaN values
        if (isFinite(targetBodyHeight) && isFinite(currentPos[1])) {
            // Smooth transition to target height
            const heightDiff = targetBodyHeight - currentPos[1];
            const bodySmoothingSpeed = 5; // Adjust for suspension stiffness
            const newY = currentPos[1] + heightDiff * dt * bodySmoothingSpeed;

            // Apply new position only if values are valid
            if (isFinite(newY)) {
                this.body.setPositionWorld([currentPos[0], newY, currentPos[2]]);
            }
        }

        // Optional: Add car body rotation based on wheel height differences
        this.updateCarBodyRotation(wheelGroundHeights, validWheelCount, dt);
    }

    /* 🚗 Update car body rotation based on wheel height differences (pitch, height) */
    updateCarBodyRotation(wheelGroundHeights, validWheelCount, dt) {
        if (
            wheelGroundHeights['FL'] == null ||
            wheelGroundHeights['FR'] == null ||
            wheelGroundHeights['BL'] == null ||
            wheelGroundHeights['BR'] == null
        )
            return; // we need all 4 wheels for accurate rotation

        /* --- 🧠 Compute average front and back heights --- */
        const frontAvgY = (wheelGroundHeights['FL'] + wheelGroundHeights['FR']) / 2;
        const backAvgY = (wheelGroundHeights['BL'] + wheelGroundHeights['BR']) / 2;

        const heightDiff = frontAvgY - backAvgY;

        /* --- 📐 Estimate pitch angle using wheelbase --- */
        const pitchRad = Math.atan2(heightDiff, this.wheelbase);
        const pitchDeg = pitchRad * (180 / Math.PI);

        // Clamp pitch to prevent insane backflips 🤸‍♂️
        const clampedPitch = Math.max(-30, Math.min(30, pitchDeg));

        /* --- 🤖 Maintain Yaw and Roll --- */
        const currentQuat = quat.create();
        this.body.getRotationWorld(currentQuat);
        const [pitchNow, yawNow, rollNow] = this.quatToEulerAngles(currentQuat).map(
            (r) => r * (180 / Math.PI)
        );

        /* --- 🎛️ Smooth Interpolation for buttery smooth suspension tilt --- */
        const smoothing = 5;
        const newPitch = this.lerp(pitchNow, clampedPitch, dt * smoothing);

        /* --- 🔁 Apply only pitch, preserve yaw and roll --- */
        const q = quat.create();
        quat.fromEuler(q, newPitch, yawNow, rollNow);
        this.body.setRotationWorld(q);
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

    spinWheels(dt) {
        const spinSpeed = this.speed * 20 * dt; // tune this visually
        const wheels = [this.wheelFL, this.wheelFR, this.wheelBL, this.wheelBR];
        for (const wheel of wheels) {
            if (!wheel) continue;
            wheel.rotateAxisAngleDegObject([0, 1, 0], spinSpeed);
        }
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
}
