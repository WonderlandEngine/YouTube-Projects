import {Component, Property} from '@wonderlandengine/api';

/* Records */
class RegenerationSettings {
    static Properties = {
        regenerationEnabled: Property.bool(true), // Whether health regeneration is enabled
        regenerationDelay: Property.float(200), // The delay in milliseconds, before health regeneration starts happening
        regenerationRate: Property.float(400), // The rate interval in milliseconds, at which health regenerates (The lower the number, the faster the regeneration)
        regenerationAmount: Property.float(10), // The amount of health to regenerate each interval
    };
}

class HealthBarSettings {
    static Properties = {
        healthBar: Property.object(), // The health bar object
        healthBarBackground: Property.object(), // The health bar background object
    };
}

class LookAtPlayerSettings {
    static Properties = {
        playerToLookAt: Property.object(), // The player object to look at
        healthBarParent: Property.object(), // The parent object of the health bar, to look at the player
    };
}

/**
 * health
 * Handles the health logic.
 */
export class Health extends Component {
    static TypeName = 'health';
    /* Properties that are configurable in the editor */
    static Properties = {
        /* Health */
        health: Property.float(100), // The default health

        /* Regeneration */
        regeneration: Property.record(RegenerationSettings),

        /* Health Bar */
        healthBarSettings: Property.record(HealthBarSettings),

        /* Looking at player */
        lookAtPlayerSettings: Property.record(LookAtPlayerSettings),
    };

    /* Gets called on game start */
    start() {
        /* Initialize callbacks */
        this.initCallbacks();

        /* Initialize health */
        this.health = 100;
        this.maxHealth = this.health;
        this.healthBarFullScale = this.healthBarSettings.healthBar.getScalingLocal();

        /* Health Bar */
        this.updateHealthBar(); // Update bar on start
    }

    /* Gets called every frame */
    update(dt) {
        // Look at the player
        this.lookAtPlayer();
    }

    initCallbacks() {
        /* Initialize onDeathCallback, so that it can be used in other components */
        if (this.onDeathCallback === undefined) {
            this.onDeathCallback = null;
        }
        
        /* Initialize onHealthFullRegeneratedCallback, so that it can be used in other components */
        if (this.onHealthFullRegeneratedCallback === undefined) {
            this.onHealthFullRegeneratedCallback = null;
        }
    }

    /* Look at the player */
    lookAtPlayer() {
        /* Only rotate the Y axis to face the player */
        if (this.lookAtPlayerSettings.playerToLookAt) {
            // Get positions
            const myPos = this.lookAtPlayerSettings.healthBarParent.getPositionWorld();
            const playerPos = this.lookAtPlayerSettings.playerToLookAt.getPositionWorld();

            // Calculate direction vector in X-Z plane (ignore Y)
            const dx = playerPos[0] - myPos[0];
            const dz = playerPos[2] - myPos[2];

            // Calculate angle in degrees (atan2 returns radians)
            const angleRad = Math.atan2(dx, dz);
            const angleDeg = (angleRad * 180) / Math.PI;

            // Rotate around Y axis in local space
            this.lookAtPlayerSettings.healthBarParent.setRotationLocal([0, 0, 0, 1]); // Reset rotation
            this.lookAtPlayerSettings.healthBarParent.rotateAxisAngleDegLocal(
                [0, 1, 0],
                angleDeg
            );
        }
    }

    /* Decreases health by a specified amount
     * Call this function from weapon to minus health on bullet hit
     */
    minusHealth(amount) {
        // Reduce health by the specified amount (if health is less than 0, then don't reduce it)
        if (this.health > 0) {
            this.health -= amount;
        }
        console.log(`Health reduced by ${amount}. Current health: ${this.health}`);

        // If the health is less than or equal to 0, call the onDeath function
        if (this.health <= 0) {
            this.onDeath();
        }

        // Wait for the regeneration delay before regenerating health (if regeneration is enabled)
        if (this.regeneration.regenerationEnabled) {
            setTimeout(() => {
                console.log('Starts regenerating health');
                this.regenerateHealth();
            }, this.regeneration.regenerationDelay);
        }

        // Update bar after damage
        this.updateHealthBar();
    }

    /* RegenerateHealth - Restores health over time */
    regenerateHealth() {
        // Clear any existing interval to prevent multiple intervals running
        if (this.regenerationInterval) {
            clearInterval(this.regenerationInterval);
        }

        // If health is 0, then don't regenerate
        if (this.health <= 0) {
            return;
        }

        // Start regenerating health over time
        this.regenerationInterval = setInterval(() => {
            if (this.health < this.maxHealth) {
                // Increase health by the regeneration amount
                this.health += this.regeneration.regenerationAmount;
                console.log(
                    `Health regenerated by ${this.regeneration.regenerationAmount}. Current health: ${this.health}`
                );

                // Ensure health does not exceed max health
                if (this.health > this.maxHealth) {
                    this.health = this.maxHealth;
                }

                // Update bar after regeneration
                this.updateHealthBar();
            } else {
                // Stop the interval when health is fully regenerated
                clearInterval(this.regenerationInterval);
                console.log('Health fully regenerated');

                /* Notify the linked component (like scarecrow) if callback is registered */
                if (this.onHealthFullRegeneratedCallback) {
                    this.onHealthFullRegeneratedCallback();
                }
            }
        }, this.regeneration.regenerationRate);
    }

    /* Updates the floating health bar scale over time */
    updateHealthBar() {
        if (!this.healthBarSettings.healthBar) return;

        // Calculate health percentage
        const healthPercent = Math.max(this.health / this.maxHealth, 0);

        // Apply only on X-axis, keep Y & Z from original
        this.healthBarSettings.healthBar.setScalingLocal([
            this.healthBarFullScale[0] * healthPercent,
            this.healthBarFullScale[1],
            this.healthBarFullScale[2],
        ]);
    }

    /* Gets called when the object is dead (Health reaches 0) */
    onDeath() {
        console.log('Enemy is dead! Do whatever you want here');

        /* Notify the linked component (like scarecrow) if callback is registered */
        if (this.onDeathCallback) {
            this.onDeathCallback();
        }

        /* Revive & Regenerate health, after 3 second delay */
        setTimeout(() => {
            console.log('Revived');
            this.health = 1; // Increase health above 0, to enable regeneration
            this.updateHealthBar(); // Update bar after revival
            this.regenerateHealth(); // Regenerate health
        }, 3000);
    }
}
