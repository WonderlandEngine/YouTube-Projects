import {Component, Property} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';
import {Hud} from './hud';

/* Records */
class CameraShakeSettings {
    static Properties = {
        verticalIntensity: Property.float(0.5), // Vertical shake intensity
        horizontalIntensity: Property.float(1.0), // Horizontal shake intensity
    };
}

/**
 * weapon
 * Handles the weapon logic.
 */
export class Weapon extends Component {
    static TypeName = 'weapon';
    /* Properties that are configurable in the editor */
    static Properties = {
        camera: Property.object(), // Reference to the camera view component, to aim at its center (usually NonVrCamera)
        fireRate: Property.float(1.0), // Bullets per second
        bulletSpeed: Property.float(5.0), // Speed of bullets
        pivotFire: Property.object(), // Pivot of fire
        muzzleFlash: Property.object(), // Muzzle flash
        maxBullets: Property.int(30), // Max bullets per magazine
        magazineCount: Property.int(90), // Total number of bullets available
        cameraShake: Property.record(CameraShakeSettings), // Camera shake settings
        useRaycast: Property.bool(true), // Use raycast instead of projectile bullets
        raycastRange: Property.float(1000.0), // Maximum range for raycast
    };

    /* Gets called on game start */
    start() {
        /* Initialize variables */
        this.timeSinceLastShot = 0; // Time since last shot
        this.isFiring = false; // Control firing state
        this.currentBullets = this.maxBullets; // Initialize current bullets
        this.currentMagazines = this.magazineCount; // Initialize current magazines

        // Disable MuzzleFlash (if there is a muzzle flash assigned)
        if (this.muzzleFlash) {
            this.muzzleFlash.active = false;
        }

        // Initialize draw-line component for raycast visualization (Acting as bullets visualizer)
        this.drawLine = this.object.getComponent('draw-line');

        // Initialize HUD (to show the current bullets and magazines)
        this.hud = this.object.getComponent('hud');
        this.hud.updateHUD(this.currentBullets, this.currentMagazines);
    }

    /* Gets called every frame */
    update(dt) {
        // Update time since last shot
        this.timeSinceLastShot += dt;

        // Fire if the weapon is in firing mode and enough time has passed
        if (this.isFiring && this.timeSinceLastShot >= 1.0 / this.fireRate) {
            this.fire();
            this.timeSinceLastShot = 0;
        }

        // Debugging
        // console.log('pivotFire position:', this.pivotFire.getPositionWorld());
    }

    /* Turns the firing flag on (Called when the player presses the fire button) */
    startFiring() {
        this.isFiring = true; // Start firing
    }

    /* Turns the firing flag off (Called when the player releases the fire button) */
    stopFiring() {
        this.isFiring = false; // Stop firing
    }

    /* The main firing system */
    fire() {
        // Check if there are bullets left
        if (this.currentBullets <= 0) {
            console.log('No bullets left! Reload needed.');
            return;
        }

        // Check if there is a pivot assigned
        if (!this.pivotFire) {
            console.warn('No pivot assigned!');
            return;
        }

        // Get the bullet component (only needed for projectile shooting)
        const bulletComponent = this.object.getComponent('bullet');
        if (!this.useRaycast && !bulletComponent) {
            console.warn('No bullet component found!');
            return;
        }

        // Trigger muzzle flash on fire (if there is a muzzle flash assigned)
        if (this.muzzleFlash) {
            this.triggerMuzzleFlash();
        }

        /* Projectile vs Raycast shooting */
        if (this.useRaycast) {
            // Use raycast shooting
            this.fireRaycast();
        } else {
            // Use projectile bullet shooting
            this.fireProjectile(bulletComponent);
        }

        // Decrease bullet count
        this.currentBullets--;

        // Update HUD via hud.js, to show the current bullets and magazines
        this.hud.updateHUD(this.currentBullets, this.currentMagazines);

        // Recoil animation
        if (this.camera) {
            // Crosshair recoil
            this.camera.getComponent('thirdperson-camera')?.animateCrosshairRecoil();

            // Camera shake recoil effect
            this.camera
                .getComponent('thirdperson-camera')
                ?.cameraShakeRecoil(
                    this.cameraShake.verticalIntensity,
                    this.cameraShake.horizontalIntensity
                );
        }
    }

    /* Independent projectile firing function */
    fireProjectile(bulletComponent) {
        // Calculate direction from pivotFire toward camera center target
        const rayStart = this.pivotFire.getPositionWorld();
        const fireDirection = this.calculateBulletDirection();

        // Get a bullet from the pool
        const bullet = bulletComponent.getFromPool(rayStart);
        if (!bullet) {
            console.log('No available bullets in the pool');
            return;
        }

        // Set bullet position and direction (from pivotFire to camera center target)
        bullet.setPositionWorld(rayStart);
        bulletComponent.setDirection(bullet, fireDirection, this.bulletSpeed);
    }

    /* Independent raycast firing function */
    fireRaycast() {
        // Calculate direction from pivotFire toward camera center target
        const rayStart = this.pivotFire.getPositionWorld();
        const fireDirection = this.calculateBulletDirection();

        // Calculate the end point of the raycast
        const rayEnd = vec3.create();
        vec3.scaleAndAdd(rayEnd, rayStart, fireDirection, this.raycastRange);

        // Perform the raycast
        const hit = this.engine.physics.rayCast(rayStart, fireDirection, this.raycastRange);

        // Initialize hit data variables
        let hitSomething = false;
        let hitPoint = rayEnd;
        let hitObject = null;

        // Check if anything was hit within the ray range
        if (hit.hitCount > 0) {
            for (let i = 0; i < hit.hitCount; ++i) {
                // Get the hit data
                hitSomething = true;
                hitPoint = hit.locations[i];
                hitObject = hit.objects[i];

                // Create mock 'other' object to match onBulletHit signature
                const mockOther = {
                    object: hit.objects[i],
                };

                // Use onBulletHit to handle the hit (includes filtering and damage)
                this.onBulletHit(null, mockOther, hitPoint);
                break;
            }
        }

        // Visualize the raycast using draw-line component
        if (this.drawLine) {
            const color = [1.0, 0.8, 0.0, 1.0]; // Orange leaning towards yellow
            this.drawLine.drawLine(rayStart, hitPoint, hitSomething, 0.05, color);
        } else {
            console.log(
                '🔴 No draw-line component found! (Raycast visualization disabled)'
            );
        }
    }

    /* Calculates the forward bullet direction based on camera yaw/pitch */
    calculateBulletDirection() {
        // Get camera component to access stable yaw/pitch values
        const cameraComponent = this.camera.getComponent('thirdperson-camera');
        if (!cameraComponent) {
            console.warn(
                'ThirdpersonCamera component not found, using fallback direction calculation'
            );
            // Fallback to original method if camera component is not available
            const cameraForward = vec3.create();
            this.camera.getForwardWorld(cameraForward);
            vec3.normalize(cameraForward, cameraForward);
            return cameraForward;
        }

        // Use the camera's stable yaw and pitch to calculate direction
        // This avoids issues with mouse movement affecting the direction during shooting
        const yaw = cameraComponent.yaw;
        const pitch = cameraComponent.pitch;

        // Calculate forward direction from yaw and pitch
        const direction = vec3.create();
        direction[0] = -Math.sin(yaw) * Math.cos(pitch); // X component (negated to shoot forward)
        direction[1] = -Math.sin(pitch); // Y component (for up/down)
        direction[2] = -Math.cos(yaw) * Math.cos(pitch); // Z component (negated to shoot forward)

        // Normalize the direction vector
        vec3.normalize(direction, direction);

        // Return the final direction vector
        return direction;
    }

    /* Gets called when a hit occurs - used by both projectile and raycast systems
     * For projectiles: called by bullet component with bullet object and collision data
     * For raycast: called by fireRaycast() with null bullet and mock other object
     */
    onBulletHit(bullet, other, hitPoint) {
        // 🚫 Ignore floor, self and unnamed objects
        if (
            other.object.name == 'Floor_Physx' ||
            other.object.name == this.object.name ||
            other.object.name == ''
        ) {
            return;
        }

        // Log the hit object
        console.log('Hit:', other.object.name);

        // Add force on the physx hit object, only for raycast as physx projectiles does this automatically
        if (this.useRaycast) {
            // Get the physx component of the hit object
            const hitPhysxObj = other.object.getComponent('physx');
            if (hitPhysxObj && !hitPhysxObj.static) {
                // Calculate direction from weapon to hit point
                const from = this.pivotFire.getPositionWorld();
                const to = hitPoint || other.object.getPositionWorld();
                const forceDir = vec3.create();
                vec3.subtract(forceDir, to, from);
                vec3.normalize(forceDir, forceDir);

                // Apply force in the direction of the shot
                const forceMagnitude = 100; // Force strength
                const force = vec3.create();
                vec3.scale(force, forceDir, forceMagnitude);

                // Add force at the hit position
                hitPhysxObj.addForce(force, to);
            }
        }

        // Bullet Decal onHit (only for projectile bullets)
        if (bullet) {
            this.object.getComponent('bullet')?.createBulletDecal(bullet);
            // Mark for recycling
            bullet.shouldRecycle = true;
        }

        // Call the minusHealth function of the hit object
        other.object.getComponent('health')?.minusHealth(5);
    }

    /* Reloads the weapon */
    reload() {
        // Check if there are magazines left and if the current bullets are less than the max bullets
        if (this.currentMagazines > 0 && this.currentBullets < this.maxBullets) {
            // Calculate the number of bullets needed to fill the magazine
            const bulletsNeeded = this.maxBullets - this.currentBullets;

            // Check if the current magazines are enough to fill the magazine
            if (this.currentMagazines >= bulletsNeeded) {
                // If there are enough magazines, fill the magazine and decrease the magazines count
                this.currentBullets = this.maxBullets;
                this.currentMagazines -= bulletsNeeded;
            } else {
                // If there are not enough magazines, fill the magazine with the current magazines and set the magazines count to 0
                this.currentBullets += this.currentMagazines;
                this.currentMagazines = 0;
            }

            // Log a message to the console
            console.log('Reloaded!');

            // Update HUD via hud.js, to show the current bullets and magazines
            this.hud.updateHUD(this.currentBullets, this.currentMagazines);

            // Reload happened, return true
            return true;
        } else if (this.currentMagazines <= 0) {
            // If there are no magazines left, log a message to the console
            console.log('No bullets left!');
        } else {
            // If the magazine is already full, log a message to the console
            console.log('Magazine already full!');
        }

        // Update HUD via hud.js, to show the current bullets and magazines
        this.hud.updateHUD(this.currentBullets, this.currentMagazines);

        // Reload did not happen, return false
        return false;
    }

    updateHUD() {
        console.log(
            `Bullets: ${this.currentBullets} | Magazines: ${this.currentMagazines}`
        );
    }

    /* Triggers the muzzle flash */
    triggerMuzzleFlash() {
        // Check if there is a muzzle flash assigned
        if (!this.muzzleFlash) return;

        // Duration of the flash (in milliseconds)
        const flashDuration = 50;

        // Set a random rotation around the Z-axis (0-360 degrees)
        const randomZRotation = Math.random() * 360;
        this.muzzleFlash.rotateAxisAngleDegObject([0, 1, 0], randomZRotation);

        // Activate muzzle flash
        this.muzzleFlash.active = true;

        // Deactivate after a short delay
        setTimeout(() => {
            this.muzzleFlash.active = false;
        }, flashDuration);
    }
}
