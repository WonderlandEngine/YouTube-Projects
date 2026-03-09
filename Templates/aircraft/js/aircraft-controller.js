import {Component, Property} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';

/**
 * aircraft-controller
 */
export class AircraftController extends Component {
    static TypeName = 'aircraft-controller';
    /* Properties that are configurable in the editor */
    static Properties = {
        /* Aircraft */
        body: Property.object(), // Aircraft body (PhysX box)
        camera: Property.object(), // Camera object to get the looking direction

        /* Movement */
        acceleration: Property.float(10.0), // Forward force speed
        maxSpeed: Property.float(30.0), // Cap speed
        tiltSpeed: Property.float(700.0), // Tilt speed with W/A/S/D
        gravity: Property.float(9.81), // Gravity pull

        /* Never Stop Option */
        neverStopMovement: Property.bool(true), // Never fully stop, maintain minimum speed
        minimumSpeed: Property.float(5.0), // Minimum speed to maintain when neverStopMovement is enabled

        /* Controls */
        invertPitch: Property.bool(false), // Invert W/S pitch controls?
        disableTiltWhileNotMoving: Property.bool(true), // Disable tilt ability when not moving

        /* Mouse Direction Control */
        mouseDirectionControl: Property.bool(false), // Rotate & move toward mouse direction
        mouseDirectionStrength: Property.float(2.0), // Torque strength multiplier for mouse direction control
        mouseTiltRoll: Property.bool(false), // Enable roll (tilt) when mouse moves left/right
        mouseMaxRollAngle: Property.float(45.0), // Max roll angle in degrees (0 = no limit)

        /* Customization Options */
        maxRollAngle: Property.float(0.0), // Max roll angle in degrees (0 = no limit)
        maxPitchAngle: Property.float(0.0), // Max pitch angle in degrees (0 = no limit)

        /* Auto-leveling Rotation */
        autoLevelRotation: Property.bool(true), // Auto-level rotation when no input
        levelingRotationSpeed: Property.float(200), // Speed of auto-leveling torque
    };

    start() {
        /* key state */
        this.keys = {w: false, s: false, a: false, d: false, space: false};
        this.mouseDelta = [0, 0];

        /* Velocity */
        this.velocity = vec3.create();
        this.currentSpeed = 0; // Current speed for gradual acceleration/deceleration
        this.bodyPhys = this.body.getComponent('physx');

        /* Direction vectors */
        this.forward = vec3.create();
        this.up = vec3.fromValues(0, 1, 0);
        this.right = vec3.create();

        /* Event listeners */
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key === ' ') {
                this.keys.space = true;
            } else {
                this.keys[key] = true;
            }
        });
        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key === ' ') {
                this.keys.space = false;
            } else {
                this.keys[key] = false;
            }
        });
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.engine.canvas) {
                this.mouseDelta[0] = e.movementX;
                this.mouseDelta[1] = e.movementY;
            }
        });
    }

    update(dt) {
        if (!this.bodyPhys) return;

        this.updateDirectionVectors();
        this.updateMovement(dt);
        this.updateRotation(dt);
        if (this.mouseDirectionControl) {
            this.applyMouseDirectionControl(dt);
        }
        this.resetMouseDelta();
        this.applyGravity(dt);
    }

    /* ================
    Update direction vectors based on aircraft's current orientation
    ================ */
    updateDirectionVectors() {
        this.body.getForwardWorld(this.forward);
        this.body.getRightWorld(this.right);
        this.body.getUpWorld(this.up);
    }

    /* ================
    Forward movement with Space key based on aircraft's forward direction
    ================ */
    updateMovement(dt) {
        const forward = vec3.create();
        vec3.normalize(forward, this.forward);

        if (this.keys.space) {
            // Gradually accelerate to max speed
            this.currentSpeed += this.acceleration * dt;
            if (this.currentSpeed > this.maxSpeed) {
                this.currentSpeed = this.maxSpeed;
            }
        } else {
            // Apply drag/friction for gradual deceleration
            this.currentSpeed *= Math.pow(0.98, dt * 60); // 0.98^60 ~ 0.3 per second

            // Never stop option: maintain minimum speed
            if (this.neverStopMovement) {
                if (this.currentSpeed < this.minimumSpeed) {
                    this.currentSpeed = this.minimumSpeed;
                }
            } else {
                // Standard behavior: can fully stop
                if (this.currentSpeed < 0.01) {
                    this.currentSpeed = 0;
                }
            }
        }

        // Apply velocity in forward direction based on current speed
        vec3.scale(this.velocity, forward, this.currentSpeed);

        // Apply to rigidbody
        this.bodyPhys.linearVelocity = this.velocity;
    }

    /* ================
    Rotational tilting with W/A/S/D keys
    ================ */
    updateRotation(dt) {
        const tiltAmount = this.tiltSpeed * dt;
        const torque = vec3.create();
        let hasInput = false;

        // Check if tilt is disabled while not moving
        const isMoving = this.keys.space || this.currentSpeed > 0.01;
        const canTilt = !this.disableTiltWhileNotMoving || isMoving;

        // W - Tilt up (pitch down)
        if (this.keys.w && canTilt) {
            hasInput = true;
            const pitchTorque = vec3.create();
            const pitchDirection = this.invertPitch ? -tiltAmount : tiltAmount;
            const currentPitchDeg = this.getSignedPitchDeg();

            // Clamp pitch only if maxPitchAngle is enabled
            if (
                this.maxPitchAngle <= 0 ||
                (this.invertPitch
                    ? currentPitchDeg > -this.maxPitchAngle
                    : currentPitchDeg < this.maxPitchAngle)
            ) {
                vec3.scale(pitchTorque, this.right, pitchDirection);
                vec3.add(torque, torque, pitchTorque);
            }
        }

        // S - Tilt down (pitch up)
        if (this.keys.s && canTilt) {
            hasInput = true;
            const pitchTorque = vec3.create();
            const pitchDirection = this.invertPitch ? tiltAmount : -tiltAmount;
            const currentPitchDeg = this.getSignedPitchDeg();

            // Clamp pitch only if maxPitchAngle is enabled
            if (
                this.maxPitchAngle <= 0 ||
                (this.invertPitch
                    ? currentPitchDeg < this.maxPitchAngle
                    : currentPitchDeg > -this.maxPitchAngle)
            ) {
                vec3.scale(pitchTorque, this.right, pitchDirection);
                vec3.add(torque, torque, pitchTorque);
            }
        }

        // A - Roll left
        if (this.keys.a && canTilt) {
            hasInput = true;
            const rollTorque = vec3.create();
            const currentRollDeg = this.getSignedRollDeg();

            // Clamp roll only if maxRollAngle is enabled
            if (this.maxRollAngle <= 0 || currentRollDeg > -this.maxRollAngle) {
                vec3.scale(rollTorque, this.forward, -tiltAmount);
                vec3.add(torque, torque, rollTorque);
            }
        }

        // D - Roll right
        if (this.keys.d && canTilt) {
            hasInput = true;
            const rollTorque = vec3.create();
            const currentRollDeg = this.getSignedRollDeg();

            // Clamp roll only if maxRollAngle is enabled
            if (this.maxRollAngle <= 0 || currentRollDeg < this.maxRollAngle) {
                vec3.scale(rollTorque, this.forward, tiltAmount);
                vec3.add(torque, torque, rollTorque);
            }
        }

        // Auto-leveling when no input and auto-level is enabled
        if (!hasInput && this.autoLevelRotation) {
            this.applyAutoLevelingRotation(torque, dt);
        }

        // Apply the combined torque to the PhysX body
        if (vec3.length(torque) > 0) {
            this.bodyPhys.addTorque(torque);
        }
    }

    /* ================
    Mouse Direction Control Based on Camera Look
    ================ */
    applyMouseDirectionControl(dt) {
        // Get forward vector from camera (where we're aiming)
        const targetForward = vec3.create();
        this.camera.getForwardWorld(targetForward);
        vec3.normalize(targetForward, targetForward);

        // Get current forward direction of aircraft
        const currentForward = vec3.create();
        this.body.getForwardWorld(currentForward);
        vec3.normalize(currentForward, currentForward);

        // Get rotation axis to align aircraft with camera
        const rotationAxis = vec3.create();
        vec3.cross(rotationAxis, currentForward, targetForward);

        const angleBetween = Math.acos(
            Math.max(-1, Math.min(1, vec3.dot(currentForward, targetForward)))
        );
        if (angleBetween < 0.01) return; // Ignore tiny corrections

        // Apply torque toward target direction (limited by tiltSpeed)
        const torque = vec3.create();
        vec3.normalize(rotationAxis, rotationAxis);
        vec3.scale(torque, rotationAxis, this.tiltSpeed * dt * this.mouseDirectionStrength);

        this.bodyPhys.addTorque(torque);

        // Optional: Add tilt (roll) based on horizontal mouse movement
        if (this.mouseTiltRoll) {
            this.applyMouseTiltRoll(currentForward, targetForward, dt);
        }
    }

    /* ================
    Mouse Tilt Roll
    ================ */
    applyMouseTiltRoll(currentForward, targetForward, dt) {
        // Calculate side direction: cross product of forward and target to get left/right offset
        const sideAxis = vec3.create();
        vec3.cross(sideAxis, currentForward, targetForward);

        const rollStrength = vec3.dot(sideAxis, vec3.fromValues(0, 1, 0)); // Positive = roll right, negative = left

        const currentRollDeg = this.getSignedRollDeg();

        // Clamp roll only if mouseMaxRollAngle is enabled
        if (this.mouseMaxRollAngle > 0) {
            // If we're already past max allowed tilt, don't apply more torque in that direction
            if (Math.abs(currentRollDeg) >= this.mouseMaxRollAngle) {
                return; // Skip adding torque if beyond max
            }
        }

        // Clamp roll only if mouseMaxRollAngle is enabled
        const rollTorque = vec3.create();
        vec3.scale(
            rollTorque,
            this.forward,
            -rollStrength * this.tiltSpeed * dt * this.mouseDirectionStrength
        );
        this.bodyPhys.addTorque(rollTorque);
    }

    /* ================
    Reset mouse delta (camera handles mouse input)
    ================ */
    resetMouseDelta() {
        this.mouseDelta = [0, 0];
    }

    /* ================
    Gravity pull when not accelerating
    ================ */
    applyGravity(dt) {
        // Apply gravity when not accelerating and either fully stopped or neverStopMovement is disabled
        const shouldApplyGravity =
            !this.keys.space &&
            (this.currentSpeed === 0 ||
                (!this.neverStopMovement && this.currentSpeed <= 0.01));

        if (shouldApplyGravity) {
            this.bodyPhys.addForce([0, -this.gravity * dt, 0]);
        }
    }

    /* ================
    Auto-leveling: gradually return to default rotation when no input
    ================ */
    applyAutoLevelingRotation(torque, dt) {
        const levelingAmount = this.levelingRotationSpeed * dt;

        // Get current up vector and compare to world up
        const currentUp = vec3.create();
        const worldUp = vec3.fromValues(0, 1, 0);
        this.body.getUpWorld(currentUp);

        // Calculate correction needed to align up vectors
        const correctionAxis = vec3.create();
        vec3.cross(correctionAxis, currentUp, worldUp);

        // Only apply correction if there's significant misalignment
        const misalignmentMagnitude = vec3.length(correctionAxis);
        if (misalignmentMagnitude > 0.01) {
            // Threshold to prevent jitter
            vec3.normalize(correctionAxis, correctionAxis);

            // Scale correction based on misalignment severity
            const correctionStrength = Math.min(misalignmentMagnitude * 2, 1); // Cap at 1
            const correctionTorque = vec3.create();
            vec3.scale(
                correctionTorque,
                correctionAxis,
                levelingAmount * correctionStrength
            );

            vec3.add(torque, torque, correctionTorque);
        }
    }

    /* ================================================== */
    /* ================ HELPER FUNCTIONS ================ */
    /* ================================================== */

    /* ================
    Helper function to convert quaternion to Euler angles
    ================ */
    quaternionToEuler(q) {
        const [x, y, z, w] = q;

        // Roll (x-axis rotation)
        const sinr_cosp = 2 * (w * x + y * z);
        const cosr_cosp = 1 - 2 * (x * x + y * y);
        const roll = Math.atan2(sinr_cosp, cosr_cosp);

        // Pitch (y-axis rotation)
        const sinp = 2 * (w * y - z * x);
        const pitch =
            Math.abs(sinp) >= 1 ? (Math.sign(sinp) * Math.PI) / 2 : Math.asin(sinp);

        // Yaw (z-axis rotation)
        const siny_cosp = 2 * (w * z + x * y);
        const cosy_cosp = 1 - 2 * (y * y + z * z);
        const yaw = Math.atan2(siny_cosp, cosy_cosp);

        return {roll, pitch, yaw};
    }

    /* ================
    Returns signed roll angle in degrees (-180 to +180)
    ================ */
    getSignedRollDeg() {
        const right = vec3.create();
        const expectedRight = vec3.create();
        const forward = vec3.create();
        const worldUp = vec3.fromValues(0, 1, 0);

        this.body.getRightWorld(right);
        this.body.getForwardWorld(forward);

        // Ideal right vector (plane level with world up)
        vec3.cross(expectedRight, forward, worldUp);
        vec3.normalize(expectedRight, expectedRight);

        let dot = vec3.dot(right, expectedRight);
        dot = Math.max(-1, Math.min(1, dot));
        const angle = Math.acos(dot);

        // Determine roll direction
        const cross = vec3.create();
        vec3.cross(cross, expectedRight, right);
        const direction = vec3.dot(cross, forward) > 0 ? 1 : -1;

        return angle * (180 / Math.PI) * direction;
    }

    /* ================
    Returns signed pitch angle in degrees (-90 to +90)
    ================ */
    getSignedPitchDeg() {
        const forward = vec3.create();
        const right = vec3.create();
        const worldUp = vec3.fromValues(0, 1, 0);

        this.body.getForwardWorld(forward);
        this.body.getRightWorld(right);

        // Project forward vector onto horizontal plane
        const forwardHorizontal = vec3.create();
        vec3.copy(forwardHorizontal, forward);
        forwardHorizontal[1] = 0; // Remove Y component
        vec3.normalize(forwardHorizontal, forwardHorizontal);

        // Calculate pitch angle using dot product
        let dot = vec3.dot(forward, forwardHorizontal);
        dot = Math.max(-1, Math.min(1, dot));
        const angle = Math.acos(dot);

        // Determine pitch direction (positive = nose up, negative = nose down)
        const direction = forward[1] > 0 ? 1 : -1;

        return angle * (180 / Math.PI) * direction;
    }
}
