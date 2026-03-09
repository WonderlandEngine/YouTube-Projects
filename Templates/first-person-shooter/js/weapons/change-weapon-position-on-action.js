import {Component, Property} from '@wonderlandengine/api';
import {vec3, quat} from 'gl-matrix';

/**
 * change-weapon-position-on-action
 * Smoothly transitions weapon position and rotation between default and aim transforms
 */
export class ChangeWeaponPositionOnAction extends Component {
    static TypeName = 'change-weapon-position-on-action';

    /* Properties that are configurable in the editor */
    static Properties = {
        weaponPositionDefault: Property.object(), // Reference object of the default weapon position
        weaponPositionAim: Property.object(), // Reference object of the aim weapon position
        weaponPositionReload: Property.object(), // Reference object of the reload weapon position
        lerpSpeed: Property.float(8.0), // Speed of position and rotation transition
    };

    start() {
        /* Initialize positions, rotations and state */

        // Get the default weapon position and rotation
        this.weaponPositionDefaultTemp = vec3.create();
        this.weaponPositionDefault.getPositionLocal(this.weaponPositionDefaultTemp);

        this.weaponRotationDefaultTemp = quat.create();
        this.weaponPositionDefault.getRotationLocal(this.weaponRotationDefaultTemp);

        // Get the aim weapon position and rotation
        this.weaponPositionAimTemp = vec3.create();
        this.weaponPositionAim.getPositionLocal(this.weaponPositionAimTemp);

        this.weaponRotationAimTemp = quat.create();
        this.weaponPositionAim.getRotationLocal(this.weaponRotationAimTemp);

        // Get the reload weapon position and rotation
        this.weaponPositionReloadTemp = vec3.create();
        this.weaponPositionReload.getPositionLocal(this.weaponPositionReloadTemp);

        this.weaponRotationReloadTemp = quat.create();
        this.weaponPositionReload.getRotationLocal(this.weaponRotationReloadTemp);

        // Current lerp position and target
        this.currentPosition = vec3.create();
        vec3.copy(this.currentPosition, this.weaponPositionDefaultTemp);

        this.targetPosition = vec3.create();
        vec3.copy(this.targetPosition, this.weaponPositionDefaultTemp);

        // Current lerp rotation and target
        this.currentRotation = quat.create();
        quat.copy(this.currentRotation, this.weaponRotationDefaultTemp);

        this.targetRotation = quat.create();
        quat.copy(this.targetRotation, this.weaponRotationDefaultTemp);

        // Weapon states
        this.isAiming = false;
        this.isReloading = false;

        // Set initial position and rotation
        this.object.setPositionLocal(this.currentPosition);
        this.object.setRotationLocal(this.currentRotation);
    }

    update(dt) {
        /* Lerp weapon position and rotation towards targets */

        // Calculate lerp factor
        const lerpFactor = Math.min(1.0, this.lerpSpeed * dt);

        // Lerp current position towards target
        vec3.lerp(
            this.currentPosition,
            this.currentPosition,
            this.targetPosition,
            lerpFactor
        );

        // Lerp current rotation towards target (slerp for smooth quaternion interpolation)
        quat.slerp(
            this.currentRotation,
            this.currentRotation,
            this.targetRotation,
            lerpFactor
        );

        // Apply the position and rotation to the weapon
        this.object.setPositionLocal(this.currentPosition);
        this.object.setRotationLocal(this.currentRotation);
    }

    /* Start aiming - transition to aim position and rotation */
    startAim() {
        this.isAiming = true;

        // Prevent position changes while reloading, but still update aiming state
        if (this.isReloading) return;

        vec3.copy(this.targetPosition, this.weaponPositionAimTemp);
        quat.copy(this.targetRotation, this.weaponRotationAimTemp);
    }

    /* End aiming - transition back to default position and rotation */
    endAim() {
        this.isAiming = false;

        // Prevent position changes while reloading, but still update aiming state
        if (this.isReloading) return;

        vec3.copy(this.targetPosition, this.weaponPositionDefaultTemp);
        quat.copy(this.targetRotation, this.weaponRotationDefaultTemp);
    }

    /* Start reloading - transition to reload position and rotation */
    startReload() {
        this.isReloading = true;
        vec3.copy(this.targetPosition, this.weaponPositionReloadTemp);
        quat.copy(this.targetRotation, this.weaponRotationReloadTemp);
    }

    /* End reloading - transition back to appropriate position based on aiming state */
    endReload() {
        this.isReloading = false;

        // If still aiming, return to aim position; otherwise, return to default
        if (this.isAiming) {
            vec3.copy(this.targetPosition, this.weaponPositionAimTemp);
            quat.copy(this.targetRotation, this.weaponRotationAimTemp);
        } else {
            vec3.copy(this.targetPosition, this.weaponPositionDefaultTemp);
            quat.copy(this.targetRotation, this.weaponRotationDefaultTemp);
        }
    }
}
