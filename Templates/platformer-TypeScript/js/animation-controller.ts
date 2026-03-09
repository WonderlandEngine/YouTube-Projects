import {
    AnimationComponent,
    Component,
    Object3D,
    property,
    Property,
    Animation,
} from '@wonderlandengine/api';

/* Records */
class DefaultAnimationsSettings {
    @property.animation()
    idle!: Animation;

    @property.animation()
    walk!: Animation;

    @property.animation()
    run!: Animation;

    @property.animation()
    jump!: Animation;
}

/**
 * Animation Controller Component
 * Handles player animation state switching independently.
 * Simple and beginner-friendly implementation
 */
export class AnimationController extends Component {
    static TypeName = 'animation-controller';

    /* Properties configurable in the editor */
    @property.object({required: true})
    animatedCharacter!: Object3D; // The character that has animations, should be a child of the player

    @property.bool(false)
    isDebug!: boolean; // Enable debug logs?

    @property.record(DefaultAnimationsSettings)
    defaultAnimations!: DefaultAnimationsSettings; // Default animations

    /* Internal state tracking */
    private currentAnimState: string | null = null;
    private animComp: AnimationComponent | null = null;

    /* Gets called on game start */
    start() {
        // Track current animation to avoid replays
        this.currentAnimState = null;
        this.animComp = this.animatedCharacter?.getComponent(AnimationComponent);
    }

    /*
     * Call this function from movement script, to change the animation.
     * Example:
     * animControllerObject.getComponent(AnimationController)?.setAnimation('walk'); // Will change to walk animation
     */
    setAnimation(state: string) {
        // Check whether the animation component is valid and the current animation state is the same as the new state
        if (!this.animComp || this.currentAnimState === state) return;

        // Debug log if enabled, for tracking the animations changes
        if (this.isDebug) {
            console.log('[AnimController] Changing to:', state); // Debug
        }

        // Clear current anim before setting new one
        this.animComp.animation = null;

        // Set the animation state
        this.defaultAnim(state);

        // Play the animation
        this.animComp.play();
        this.currentAnimState = state;
    }

    /* The default animations */
    private defaultAnim(state: string) {
        // Switch to correct animation based on the state
        switch (state) {
            case 'idle':
                this.animComp!.animation = this.defaultAnimations.idle; // Set the animation
                this.animComp!.playCount = 0; // Loop
                this.animComp!.speed = 1.0; // adjust animation speed
                break;
            case 'walk':
                this.animComp!.animation = this.defaultAnimations.walk; // Set the animation
                this.animComp!.playCount = 0; // Loop
                this.animComp!.speed = 1.0; // adjust animation speed
                break;
            case 'run':
                this.animComp!.animation = this.defaultAnimations.run; // Set the animation
                this.animComp!.playCount = 0; // Loop
                this.animComp!.speed = 1.25; // adjust animation speed
                break;
            case 'jump':
                this.animComp!.animation = this.defaultAnimations.jump; // Set the animation
                this.animComp!.playCount = 0; // Loop
                this.animComp!.speed = 1.0; // adjust animation speed
                break;
            default:
                console.warn('Unknown animation state:', state);
                return;
        }
    }
}
