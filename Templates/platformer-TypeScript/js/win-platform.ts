import {
    Component,
    CollisionEventType,
    PhysXComponent,
    Object3D,
    property,
} from '@wonderlandengine/api';

/**
 * Win Platform Component
 * When player touches platform: flag and text rise up
 * When player leaves platform: flag and text go back down
 * Simple and beginner-friendly implementation
 */
export class WinPlatform extends Component {
    static TypeName = 'win-platform';

    /* Properties configurable in the editor */
    @property.object()
    flagBanner!: Object3D; // Flag to animate

    @property.object()
    winText!: Object3D; // Text to animate

    @property.float(2.0)
    riseHeight!: number; // How high to rise

    @property.float(3.0)
    animationSpeed!: number; // Speed of flag/text animation

    /* Internal state tracking */
    private playerOn = false;
    private flagStart: number[] = [0, 0, 0];
    private textStart: number[] = [0, 0, 0];
    private collisionCallbackId: number | null = null;

    /* Called when component is activated */
    onActivate() {
        // Set up collision detection
        this.setupCollisionListener();
    }

    /* Called when component is deactivated */
    onDeactivate() {
        // Remove collision listener using stored callback ID
        if (this.collisionCallbackId !== null) {
            const physx = this.object.getComponent(PhysXComponent);
            if (physx) {
                physx.removeCollisionCallback(this.collisionCallbackId);
            }
            this.collisionCallbackId = null;
        }
    }

    /* Initialization */
    start() {
        // Track if player is on the platform
        this.playerOn = false;

        // Remember starting positions
        const flagPos = this.flagBanner?.getPositionWorld();
        this.flagStart = flagPos ? Array.from(flagPos) : [0, 0, 0];

        const textPos = this.winText?.getPositionWorld();
        this.textStart = textPos ? Array.from(textPos) : [0, 0, 0];
    }

    /* Called every frame */
    update(dt: number) {
        // Move flag up/down
        if (this.flagBanner) {
            const targetY = this.flagStart[1] + (this.playerOn ? this.riseHeight : 0);
            const currentPos = this.flagBanner.getPositionWorld();
            currentPos[1] = this.moveTowards(
                currentPos[1],
                targetY,
                this.animationSpeed * dt
            );
            this.flagBanner.setPositionWorld(currentPos);
        }

        // Move text up/down
        if (this.winText) {
            const targetY = this.textStart[1] + (this.playerOn ? this.riseHeight : 0);
            const currentPos = this.winText.getPositionWorld();
            currentPos[1] = this.moveTowards(
                currentPos[1],
                targetY,
                this.animationSpeed * dt
            );
            this.winText.setPositionWorld(currentPos);
        }
    }

    /* Set up collision detection for the win platform */
    private setupCollisionListener() {
        const physx = this.object.getComponent(PhysXComponent);
        if (!physx) {
            console.warn('Win platform needs a physx component!');
            return;
        }

        // Listen for collisions with the player and store callback ID
        this.collisionCallbackId = physx.onCollision(
            (type: CollisionEventType, other: PhysXComponent) => {
                if (other.object.name === 'Player') {
                    // Set playerOn to true if player is touching the platform
                    this.playerOn = type === CollisionEventType.Touch;
                }
            }
        );
    }

    /* Helper: smooth movement */
    private moveTowards(current: number, target: number, animationSpeed: number): number {
        if (Math.abs(target - current) < 0.01) return target;
        return current + Math.sign(target - current) * animationSpeed;
    }
}
