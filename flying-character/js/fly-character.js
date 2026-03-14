import {Component, Property} from '@wonderlandengine/api';
import {vec3, quat} from 'gl-matrix';

/**
 * fly-character
 * Press F to turn flying on/off. When flying: W=forward, S=back, A=left, D=right (camera-relative).
 * Add this component to the same object that has "tps-movement" and "physx".
 */
export class FlyCharacter extends Component {
    static TypeName = 'fly-character';
    static Properties = {
        headObject: Property.object(), // Camera object (e.g. NonVRCamera). Where you look = fly direction.
        flySpeed: Property.float(20), // How fast you move when flying.
        animatedCharacter: Property.object(), // The character that has "animation" component (same as tps-movement).
        animFlyIdle: Property.animation(), // Play when flying but not moving.
        animFlyForward: Property.animation(), // Play when flying and moving (any direction).
    };

    /* Section: Variables we use every frame */
    isFlying = false; // true = we are flying, false = normal walking
    tpsMovement = null; // reference to the walking component (we turn it off when flying)
    physx = null; // reference to physics (we make it kinematic so gravity doesn't pull us)
    animComp = null; // reference to "animation" on animatedCharacter (for fly animations)
    currentFlyAnim = null; // 'idle' or 'forward' - only switch animation when this changes
    forward = false; // is W held?
    back = false; // is S held?
    right = false; // is D held?
    left = false; // is A held?

    start() {
        // Get the other components on this object
        this.tpsMovement = this.object.getComponent('tps-movement');
        this.physx = this.object.getComponent('physx');

        // If no head assigned, use this object (so something still works)
        this.headObject = this.headObject || this.object;

        // Animation: get the "animation" component from the character mesh (for fly clips)
        this.animComp = this.animatedCharacter?.getComponent('animation');

        // Listen for keyboard
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    /* Section: Keyboard input */
    onKeyDown(e) {
        const key = e.key.toLowerCase();
        // F = toggle fly mode
        if (key === 'f') {
            this.toggleFly();
            e.preventDefault();
            return;
        }

        // Only react to WASD when we are actually flying
        if (!this.isFlying) return;
        if (key === 'w') this.forward = true;
        if (key === 's') this.back = true;
        if (key === 'd') this.right = true;
        if (key === 'a') this.left = true;
    }

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === 'w') this.forward = false;
        if (key === 's') this.back = false;
        if (key === 'd') this.right = false;
        if (key === 'a') this.left = false;
    }

    /* Section: Turn flying on or off */
    toggleFly() {
        this.isFlying = !this.isFlying;
        // When flying: disable walking. When not flying: enable walking again.
        if (this.tpsMovement) this.tpsMovement.active = !this.isFlying;

        // When flying: make body kinematic (no gravity). When not: normal physics again.
        if (this.physx) this.physx.kinematic = this.isFlying;
        if (this.isFlying) {
            this.forward = this.back = this.right = this.left = false;
            this.physx.linearVelocity = [0, 0, 0]; // stop any leftover velocity
            this.currentFlyAnim = null; // force refresh of fly animation next frame
        }
    }

    /* Section: Fly animations — only switch when state changes (idle vs moving) */
    playFlyAnim(state) {
        if (!this.animComp || this.currentFlyAnim === state) return;
        this.currentFlyAnim = state;
        const clip = state === 'forward' ? this.animFlyForward : this.animFlyIdle;

        if (!clip) return;
        this.animComp.animation = clip;
        this.animComp.playCount = 0; // loop
        this.animComp.speed = 1.0;
        this.animComp.play();
    }

    /* Section: Move the character when flying (called every frame) */
    update(dt) {
        if (!this.isFlying || !this.physx) return;

        // Get "forward" and "right" in world space from where the camera looks
        const cameraRotation = this.headObject.getRotationWorld();
        const forwardDirection = vec3.fromValues(0, 0, -1); // default forward in engine
        const rightDirection = vec3.fromValues(1, 0, 0); // default right
        vec3.transformQuat(forwardDirection, forwardDirection, cameraRotation);
        vec3.transformQuat(rightDirection, rightDirection, cameraRotation);
        vec3.normalize(forwardDirection, forwardDirection);
        vec3.normalize(rightDirection, rightDirection);

        // Build move direction from keys (W/S = forward/back, A/D = left/right)
        const moveDirection = vec3.create();
        if (this.forward) vec3.add(moveDirection, moveDirection, forwardDirection);
        if (this.back) vec3.sub(moveDirection, moveDirection, forwardDirection);
        if (this.right) vec3.add(moveDirection, moveDirection, rightDirection);
        if (this.left) vec3.sub(moveDirection, moveDirection, rightDirection);

        // If any key is pressed, move the object and rotate to face movement
        const isMoving = vec3.length(moveDirection) > 0.0001;
        if (isMoving) {
            vec3.normalize(moveDirection, moveDirection);
            this.rotateTowardDirection(moveDirection, dt);
            vec3.scale(moveDirection, moveDirection, this.flySpeed * dt); // distance = speed * time
            const currentPosition = this.object.getPositionWorld(vec3.create());
            vec3.add(currentPosition, currentPosition, moveDirection);
            this.object.setPositionWorld(currentPosition);
        }

        // Play fly animation: forward when moving, idle when hovering
        this.playFlyAnim(isMoving ? 'forward' : 'idle');
    }

    /* Section: Rotate character to face movement direction (smooth) */
    rotateTowardDirection(direction, dt) {
        const mesh = this.animatedCharacter || this.object;
        if (!mesh) return;
        // Use only horizontal direction to avoid weird flips near zero/opposite vectors
        const flatDirection = vec3.fromValues(direction[0], 0, direction[2]);
        if (vec3.length(flatDirection) < 0.0001) return;
        vec3.normalize(flatDirection, flatDirection);
        const currentRotation = quat.create();
        mesh.getRotationWorld(currentRotation);
        const targetRotation = quat.create();
        // Yaw only: stable and beginner-friendly
        const yawRadians = Math.atan2(flatDirection[0], flatDirection[2]);
        quat.fromEuler(targetRotation, 0, (yawRadians * 180) / Math.PI, 0);
        quat.slerp(currentRotation, currentRotation, targetRotation, Math.min(dt * 7, 1));
        mesh.setRotationWorld(currentRotation);
    }
}
