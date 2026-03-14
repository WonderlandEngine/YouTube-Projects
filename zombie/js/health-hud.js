import {Component, Property} from '@wonderlandengine/api';

/**
 * health-hud
 * Independent health bar HUD component that can be dragged onto any object
 */
export class HealthHud extends Component {
    static TypeName = 'health-hud';
    /* Properties that are configurable in the editor */
    static Properties = {
        healthBar: Property.object(), // The health bar object to scale
        healthBarParent: Property.object(), // The parent object that rotates to face player
        player: Property.object(), // The player object to look at
        yawOffsetDeg: Property.float(0), // Optional: fix bar facing wrong direction (try 180)
    };

    start() {
        /* Temp vectors (avoid new allocations every frame) */
        this._myPos = [0, 0, 0];
        this._playerPos = [0, 0, 0];
        this._flatTarget = [0, 0, 0];

        /* Store full scale of health bar */
        if (this.healthBar) {
            this.healthBarFullScale = this.healthBar.getScalingLocal();
        }
    }

    update(dt) {
        /* Make health bar look at player */
        this.lookAtPlayer();
    }

    /* Make health bar look at player */
    lookAtPlayer() {
        if (!this.healthBarParent || !this.player) return;

        /* Get positions */
        this.healthBarParent.getPositionWorld(this._myPos);
        this.player.getPositionWorld(this._playerPos);

        /* Flat target (same Y) => yaw-only lookAt (no wiggle) */
        this._flatTarget[0] = this._playerPos[0];
        this._flatTarget[1] = this._myPos[1];
        this._flatTarget[2] = this._playerPos[2];

        /* Look at player + optional yaw offset */
        this.healthBarParent.lookAt(this._flatTarget, [0, 1, 0]);
        if (this.yawOffsetDeg) {
            this.healthBarParent.rotateAxisAngleDegLocal([0, 1, 0], this.yawOffsetDeg);
        }
    }

    /* Update health bar scale based on health percentage */
    updateHealthBar(health, maxHealth) {
        if (!this.healthBar) return;
        
        /* Initialize full scale if not set */
        if (!this.healthBarFullScale) {
            this.healthBarFullScale = this.healthBar.getScalingLocal();
        }
        
        /* Calculate health percentage */
        const healthPercent = Math.max(health / maxHealth, 0);
        
        /* Apply only on X-axis, keep Y & Z from original */
        this.healthBar.setScalingLocal([
            this.healthBarFullScale[0] * healthPercent,
            this.healthBarFullScale[1],
            this.healthBarFullScale[2],
        ]);
    }
}
