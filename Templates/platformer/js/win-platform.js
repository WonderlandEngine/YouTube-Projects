import {
    Component,
    Property,
    CollisionEventType,
    PhysXComponent,
} from '@wonderlandengine/api';

/**
 * win-platform
 * When player touches platform: flag and text rise up
 * When player leaves platform: flag and text go back down
 */
export class WinPlatform extends Component {
    static TypeName = 'win-platform';

    /* Properties */
    static Properties = {
        flagBanner: Property.object(), // Flag to animate
        winText: Property.object(), // Text to animate
        riseHeight: Property.float(2.0), // How high to rise
        animationSpeed: Property.float(3.0), // Speed of flag/text animation
    };

    /* Initialization on start */
    start() {
        // Track if player is on the platform
        this.playerOn = false;

        // Remember starting positions
        this.flagStart = this.flagBanner?.getPositionWorld() || [0, 0, 0];
        this.textStart = this.winText?.getPositionWorld() || [0, 0, 0];
    }

    /* Called when component is activated */
    onActivate() {
        // Listen for player collision
        this.object.getComponent(PhysXComponent)?.onCollision((type, other) => {
            if (other.object.name === 'Player') {
                // Set playerOn to true if player is touching the platform
                this.playerOn = type === CollisionEventType.Touch;
            }
        });
    }

    /* Called when component is deactivated */
    onDeactivate() {
        // Remove collision listener
        this.object.getComponent(PhysXComponent)?.removeCollisionCallback();
    }

    /* Called every frame */
    update(dt) {
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

    /* Helper: smooth movement */
    moveTowards(current, target, animationSpeed) {
        if (Math.abs(target - current) < 0.01) return target;
        return current + Math.sign(target - current) * animationSpeed;
    }
}
