import {Component, Property, CollisionEventType} from '@wonderlandengine/api';

/**
 * player-weapon-manager
 * This component is responsible for managing and controlling the player's weapons.
 */
export class PlayerWeaponManager extends Component {
    static TypeName = 'player-weapon-manager';
    /* Properties that are configurable in the editor */
    static Properties = {
        camera: Property.object(), // Reference to the player camera component, usually NonVrCamera
        currentWeapon: Property.object(), // Reference to the weapon component
        holsterPosition: Property.object(), // Hostler position (on back)
        handPosition: Property.object(), // Hand position (where weapon is used)
    };

    /* Gets called on game start */
    start() {
        /* Initialize variables */
        this.isFiring = false; // Track if currently firing
        this.isAiming = false; // Track if currently aiming
        this.isReloading = false; // Track if currently reloading
        this.weaponInRange = null; // Weapon we can equip

        /* Set tps movement */
        if (this.object.getComponent('tps-movement') == null) {
            console.log(
                '❓ [player-weapon-manager] Please add "tps-movement" component to this player object'
            );
        } else {
            this.tpsMovement = this.object.getComponent('tps-movement');
        }

        /* Set current weapon animations */
        if (this.object.getComponent('animation-controller') == null) {
            console.log(
                '❓ [player-weapon-manager] Please add "animation-controller" component to this player object, for the currentWeapon animations to work'
            );
        } else {
            this.animationController = this.object.getComponent('animation-controller');
            this.animationController.setCurrentWeapon(this.currentWeapon.name);
        }

        /* Attach collision listener */
        this.rigidBody = this.object.getComponent('physx');
        this.rigidBody.onCollision((type, other) => {
            if (
                type === CollisionEventType.Touch ||
                type === CollisionEventType.TriggerTouch
            ) {
                this.onCollisionBegin(type, other);
            }
        });

        /* Add event listeners for mouse click and release */
        window.addEventListener('mousedown', (event) => this.onMouseDown(event));
        window.addEventListener('mouseup', (event) => this.onMouseUp(event));

        /* Add event listeners for key press and release */
        window.addEventListener('keydown', (event) => this.onKeyDown(event));
        window.addEventListener('keyup', (event) => this.onKeyUp(event));
    }

    /* Gets called when the mouse button is pressed */
    /* Left mouse button: Start firing, Right mouse button: Start aiming */
    onMouseDown(event) {
        // Left mouse button down, start firing
        if (event.button === 0) {
            this.startFiring();
        }

        // Right mouse button down, start aim with the camera
        if (event.button === 2) {
            this.startAim();
        }
    }

    /* Gets called when the mouse button is released */
    /* Left mouse button: Stop firing, Right mouse button: End aiming */
    onMouseUp(event) {
        // Left mouse button up
        if (event.button === 0) {
            this.stopFiring();
        }

        // Right mouse button up, end aim with the camera
        if (event.button === 2) {
            this.endAim();
        }
    }

    /* Gets called when a key is pressed */
    /* E: Equip weapon, R: Reload weapon */
    onKeyDown(event) {
        if (event.key === 'e' || event.key === 'E') {
            this.tryEquipWeapon();
        }

        if (event.key === 'r' || event.key === 'R') {
            this.reloadWeapon();
        }
    }

    /* Gets called when a key is released */
    onKeyUp(event) {}

    /* Gets called when a collision begins */
    /* If a weapon is in range, enable the ability to equip it */
    onCollisionBegin(type, other) {
        console.log('[PlayerWeaponManager] Collision:', type, other.object.name);
        const weapon = other.object.getComponent('weapon');
        if (weapon) {
            this.weaponInRange = other.object;
        }
    }

    /* Tries to equip the weapon */
    tryEquipWeapon() {
        if (!this.weaponInRange) return;

        // Unequip current weapon to holster
        if (this.currentWeapon && this.holsterPosition) {
            this.currentWeapon.parent = this.holsterPosition;
            this.currentWeapon.resetTranslationRotation(); // snap into holster
        }

        // Equip new weapon to hand
        this.currentWeapon = this.weaponInRange;
        this.currentWeapon.parent = this.handPosition;
        this.currentWeapon.resetTranslationRotation(); // snap into hand
        this.weaponInRange = null; // clear
    }

    /* Starts the aim */
    startAim() {
        /* Start camera aim */
        this.isAiming = true; // Set aiming state
        this.camera.getComponent('thirdperson-camera')?.startAim();

        /* Set aim animation */
        if (this.tpsMovement?.isJumping == true) {
            // If jumping, set aim jump animation
            this.animationController.setAnimation('aimJump');
        } else {
            // If not jumping, set aim idle animation
            this.animationController.setAnimation('aimIdle');
        }
    }

    /* Ends the aim */
    endAim() {
        /* End camera aim */
        this.isAiming = false; // Reset aiming state
        this.camera.getComponent('thirdperson-camera')?.endAim();

        /* Reset animation if not jumping or moving */
        if (this.tpsMovement?.isJumping == true) {
            // If jumping, reset to jump animation
            this.animationController.setAnimation('jump');
        } else if (this.tpsMovement?.isMoving == true) {
            // If moving, reset to walk animation
            this.animationController.setAnimation('walk');
        } else {
            // If not jumping or moving, reset to idle animation
            this.animationController.setAnimation('idle');
        }
    }

    /* Starts the firing */
    startFiring() {
        if (!this.currentWeapon || this.isReloading) return;

        /* Set firing to true, so weapon knows it should fire */
        this.isFiring = true;
        this.tpsMovement?.setFiring(true);
        this.camera.getComponent('thirdperson-camera')?.setFiring(true);
        setTimeout(() => {
            if (this.isFiring == true) {
                /* Delay firing, for the aim animation to fully play first */
                this.currentWeapon.getComponent('weapon').startFiring();
            }
        }, 100);

        /* Set jump firing animation */
        if (this.tpsMovement?.isJumping == true) {
            // If jumping, set aim jump animation
            this.animationController.setAnimation('aimJump');
        }
    }

    /* Stops the firing */
    stopFiring() {
        if (!this.currentWeapon) return;

        /* Set firing to false, so weapon stops firing */
        this.isFiring = false;
        this.tpsMovement?.setFiring(false);
        this.camera.getComponent('thirdperson-camera')?.setFiring(false);
        this.currentWeapon.getComponent('weapon').stopFiring();

        /* Reset jump firing animation */
        if (this.tpsMovement?.isJumping == true && this.isAiming == false) {
            // If jumping, set aim jump animation
            this.animationController.setAnimation('jump');
        }
    }

    /* Reloads the weapon */
    reloadWeapon() {
        if (this.isReloading || !this.currentWeapon) return;
        // Stop firing if currently shooting
        this.stopFiring();
        // Call weapon reload logic and check if reload actually happened
        const didReload = this.currentWeapon.getComponent('weapon').reload();
        if (!didReload) return; // Don't animate if reload didn't happen

        this.isReloading = true;
        this.tpsMovement.isReloading = true;
        // Play reload animation
        if (this.animationController) {
            this.animationController.setAnimation('reload');
        }
        // Set a timeout to end reloading after animation (adjust duration as needed)
        setTimeout(() => {
            console.log('done!!!❤️❤️❤️❤️');
            this.isReloading = false;
            this.tpsMovement.isReloading = false;
            // Optionally reset to idle/aim animation after reload
            if (this.isAiming) {
                this.animationController.setAnimation('aimIdle');
            } else {
                this.animationController.setAnimation('idle');
            }
        }, 1200); // 1.2s, adjust to match your reload animation
    }
}
