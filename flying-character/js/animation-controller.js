import {Component, Property} from '@wonderlandengine/api';

/* Records */
class DefaultAnimationsSettings {
    static Properties = {
        idle: Property.animation(),
        walk: Property.animation(),
        run: Property.animation(),
        jump: Property.animation(),
    };
}
class RiflenimationsSettings {
    static Properties = {
        // normal movement animations
        idle: Property.animation(),
        walk: Property.animation(),
        run: Property.animation(),
        jump: Property.animation(),

        // aim movement animations
        aimIdle: Property.animation(),
        aimJump: Property.animation(),
        aimMoveForward: Property.animation(),
        aimMoveBackward: Property.animation(),
        aimMoveRight: Property.animation(),
        aimMoveLeft: Property.animation(),

        // reload animation
        reload: Property.animation(),
    };
}

/**
 * animation-controller
 * Handles player animation state switching independently.
 */
export class AnimationController extends Component {
    static TypeName = 'animation-controller';

    static Properties = {
        animatedCharacter: Property.object(), // The character that has animations, should be a child of the player
        isDebug: Property.bool(true), // Enable debug logs?
        defaultAnimations: Property.record(DefaultAnimationsSettings), // Default animations without weapons
        rifleAnimations: Property.record(RiflenimationsSettings), // Rifle animations
    };

    /* Gets called on game start */
    start() {
        // Track current animation to avoid replays
        this.currentAnimState = null;
        this.animComp = this.animatedCharacter?.getComponent('animation');

        // Tack weapon state
        this.currentWeaponName = null; // Track current equipped weapon
    }

    /* Equip a weapon and change default anims accordingly (Gets set from "player-weapon-manager") */
    setCurrentWeapon(weaponName) {
        this.currentWeaponName = weaponName;
    }

    /*
     * Call this from movement script, to change the animation.
     * Example:
     * animControllerObject.getComponent('animation-controller')?.setAnimation('walk'); // Will change to walk animation
     */
    setAnimation(state) {
        // Check whether the animation component is valid and the current animation state is the same as the new state
        if (!this.animComp || this.currentAnimState === state) return;

        // Debug log if enabled, for tracking the animations changes
        if (this.isDebug) {
            console.log('[AnimController] Changing to:', state); // Debug
        }

        // Clear current anim before setting new one
        this.animComp.animation = null;

        // Switch to correct animation state (Add more states for each new weapon as needed)
        if (this.currentWeaponName == 'Rifle') {
            this.rifleAnim(state);
        } else {
            this.defaultAnim(state); // Fallback to default
        }

        // Play the animation
        this.animComp.play();
        this.currentAnimState = state;
    }

    /* The default animations without weapons */
    defaultAnim(state) {
        // Switch to correct animation based on the state
        switch (state) {
            case 'idle':
                this.animComp.animation = this.defaultAnimations.idle; // Set the animation
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0; // adjust animation speed
                break;
            case 'walk':
                this.animComp.animation = this.defaultAnimations.walk; // Set the animation
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0; // adjust animation speed
                break;
            case 'run':
                this.animComp.animation = this.defaultAnimations.run; // Set the animation
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0; // adjust animation speed
                break;
            case 'jump':
                this.animComp.animation = this.defaultAnimations.jump; // Set the animation
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0; // adjust animation speed
                break;
            default:
                console.warn('Unknown animation state:', state);
                return;
        }
    }

    /* The rifle animations if currentWeapon is rifle */
    rifleAnim(state) {
        // Switch to correct animation based on the state
        switch (state) {
            case 'idle':
                this.animComp.animation = this.rifleAnimations.idle; // Set the animation
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0; // adjust animation speed
                break;
            case 'walk':
                this.animComp.animation = this.rifleAnimations.walk; // Set the animation
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0; // adjust animation speed
                break;
            case 'run':
                this.animComp.animation = this.rifleAnimations.run; // Set the animation
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0; // adjust animation speed
                break;
            case 'jump':
                this.animComp.animation = this.rifleAnimations.jump; // Set the animation
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0; // adjust animation speed
                break;

            case 'aimIdle':
                this.animComp.animation = this.rifleAnimations.aimIdle;
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0;
                break;
            case 'aimJump':
                this.animComp.animation = this.rifleAnimations.aimJump;
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0;
                break;
            case 'aimMoveForward':
                this.animComp.animation = this.rifleAnimations.aimMoveForward;
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0;
                break;
            case 'aimMoveBackward':
                this.animComp.animation = this.rifleAnimations.aimMoveBackward;
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0;
                break;
            case 'aimMoveRight':
                this.animComp.animation = this.rifleAnimations.aimMoveRight;
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0;
                break;
            case 'aimMoveLeft':
                this.animComp.animation = this.rifleAnimations.aimMoveLeft;
                this.animComp.playCount = 0; // Loop
                this.animComp.speed = 1.0;
                break;
            case 'reload':
                this.animComp.animation = this.rifleAnimations.reload;
                this.animComp.playCount = 1; // Play once
                this.animComp.speed = 2.0;
                break;
            default:
                console.warn('Unknown animation state:', state);
                return;
        }
    }
}
