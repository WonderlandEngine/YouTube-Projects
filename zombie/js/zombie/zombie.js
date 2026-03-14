import {Component, Property, CollisionEventType} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';

/**
 * zombie
 */
export class Zombie extends Component {
    static TypeName = 'zombie';
    /* Properties that are configurable in the editor */
    static Properties = {
        player: Property.object(),
        zombieSkeleton: Property.object(),
        zombieMesh: Property.object(),
        walkingAnim: Property.animation(),
        runningAnim: Property.animation(),
        attackAnim: Property.animation(),
        deathAnim: Property.animation(),
        moveSpeed: Property.float(2.0), // Movement speed towards player
        zombieDamaged: Property.material(), // Material to show when damaged
    };

    start() {
        /* Initialize position vectors */
        this.currentPos = vec3.create();
        this.targetPos = vec3.create();
        this.attackTimeout = null;
        this.isColliding = false;
        this.isDead = false;
        this.health = 100;
        this.maxHealth = 100;
        
        /* Store default material */
        const mesh0 = this.zombieMesh.getComponents('mesh')[0];
        const mesh1 = this.zombieMesh.getComponents('mesh')[1];
        if (mesh0 && mesh1) {
            this.defaultMaterial1 = mesh0.material;
            this.defaultMaterial2 = mesh1.material;
        }

        /* Get health HUD component */
        this.healthHud = this.object.getComponent('health-hud');
        if (this.healthHud) {
            this.healthHud.updateHealthBar(this.health, this.maxHealth);
        }

        /* Randomly decide if zombie should run (50% chance) */
        this.isRunning = Math.random() < 0.5;
        
        /* Setup PhysX collision detection */
        this.rigidBody = this.object.getComponent('physx');
        if (this.rigidBody) {
            this.rigidBody.onCollision((type, other) => {
                if (type === CollisionEventType.Touch || type === CollisionEventType.TriggerTouch) {
                    this.onCollisionBegin(type, other);
                } else if (type === CollisionEventType.TouchLost || type === CollisionEventType.TriggerTouchLost) {
                    this.onCollisionEnd(type, other);
                }
            });
        }
        
        /* Start movement */
        this.startMovement();
    }

    update(dt) {
        /* Check if zombie is dead */
        if (this.isDead) return;

        /* Check if player is set */
        if (!this.player) return;

        /* Move towards player */
        this.moveTowardsPlayer(dt);

        /* Rotate to face player */
        this.rotateTowardsPlayer(dt);
    }

    startMovement() {
        /* Check if zombie is dead */
        if (this.isDead) return;

        /* Play movement animation based on isRunning */
        if (this.isRunning) {
            this.zombieSkeleton.getComponent('animation').animation = this.runningAnim;
        } else {
            this.zombieSkeleton.getComponent('animation').animation = this.walkingAnim;
        }

        /* Play animation */
        this.zombieSkeleton.getComponent('animation').play();
    }

    moveTowardsPlayer(dt) {
        /* Check if zombie is dead */
        if (this.isDead) return;

        /* Get current zombie position and player position */
        this.object.getPositionWorld(this.currentPos);
        this.player.getPositionWorld(this.targetPos);
        
        /* Interpolate zombie position towards player using vec3.lerp */
        const lerpFactor = Math.min(1.0, this.moveSpeed * dt);
        vec3.lerp(this.currentPos, this.currentPos, this.targetPos, lerpFactor);
        
        /* Set new position */
        this.object.setPositionWorld(this.currentPos);
    }

    rotateTowardsPlayer(dt) {
        /* Check if zombie is dead */
        if (this.isDead) return;

        /* Get player position and make zombie look at it */
        this.player.getPositionWorld(this.targetPos);
        this.object.lookAt(this.targetPos, [0, 1, 0]);
    }

    startAttackTimer() {
        /* Check if zombie is dead */
        if (this.isDead) return;
        /* If not colliding, don't start timer */
        if (!this.isColliding) return;

        /* Start 1 second timer to damage player */
        this.attackTimeout = setTimeout(() => {
            /* Check if zombie is dead before damaging */
            if (this.isDead) return;
            /* Damage player */
            this.player.getComponent('player').minusHealth();

            /* Restart timer if still colliding */
            if (this.isColliding && !this.isDead) {
                /* Restart timer, after 1.7 seconds delay */
                setTimeout(() => this.startAttackTimer(), 1700);
            }
        }, 1000);
    }

    onCollisionBegin(type, other) {
        /* Check if zombie is dead */
        if (this.isDead) return;
        /* Check if collision is with player */
        if (other.object === this.player) {
            this.isColliding = true;
            /* Play attack animation */
            this.zombieSkeleton.getComponent('animation').animation = this.attackAnim;
            this.zombieSkeleton.getComponent('animation').play();
            /* Start 1 second timer to damage player */
            this.startAttackTimer();
        }
    }

    onCollisionEnd(type, other) {
        /* Check if zombie is dead */
        if (this.isDead) return;
        /* Check if collision is with player */
        if (other.object === this.player) {
            this.isColliding = false;
            /* Cancel attack timer if collision ended */
            if (this.attackTimeout) {
                clearTimeout(this.attackTimeout);
                this.attackTimeout = null;
            }
            /* Start movement animation */
            this.startMovement();
        }
    }

    minusHealth() {
        /* Check if zombie is dead */
        if (this.isDead) return;

        /* Decrease health by 10 */
        this.health -= 10;
        
        /* Change material to damaged for 0.1 seconds */
        this.showDamagedMaterial();
        
        /* Update health bar via health HUD component */
        if (this.healthHud) {
            this.healthHud.updateHealthBar(this.health, this.maxHealth);
        }

        /* If health is less than or equal to 0, call onDeath */
        if (this.health <= 0) {
            this.onDeath();
        }
    }

    /* Show damaged material temporarily */
    showDamagedMaterial() {
        /* Get the mesh component of the zombie mesh */
        const mesh0 = this.zombieMesh.getComponents('mesh')[0];
        const mesh1 = this.zombieMesh.getComponents('mesh')[1];

        /* Change the material to the damaged material */
        if (mesh0 && mesh1 && this.zombieDamaged) {
            mesh0.material = this.zombieDamaged;
            mesh1.material = this.zombieDamaged;

            /* Reset the material to the default material after 0.1 seconds */
            setTimeout(() => {
                if (this.defaultMaterial1 && this.defaultMaterial2) {
                    mesh0.material = this.defaultMaterial1;
                    mesh1.material = this.defaultMaterial2;
                }
            }, 100);
        }
    }

    onDeath() {
        /* Check if zombie is already dead */
        if (this.isDead) return;

        /* Set isDead flag */
        this.isDead = true;
        
        /* Cancel attack timer if active */
        if (this.attackTimeout) {
            clearTimeout(this.attackTimeout);
            this.attackTimeout = null;
        }
        
        /* Play death animation */
        this.zombieSkeleton.getComponent('animation').animation = this.deathAnim;
        this.zombieSkeleton.getComponent('animation').playCount = 1; // Play once
        this.zombieSkeleton.getComponent('animation').play();

        /* Deactive zombie's physx component */
        this.rigidBody.blocksMask = 0;
        this.rigidBody.active = false;
        setTimeout(() => this.rigidBody.destroy(), 100);

        /* Deactivate health bar HUD meshes */
        if (this.healthHud && this.healthHud.healthBarParent) {
            /* Get all children of healthBarParent */
            const children = this.healthHud.healthBarParent.children;
            for (let i = 0; i < children.length; i++) {
                /* Get mesh components and deactivate them */
                const meshes = children[i].getComponents('mesh');
                for (let j = 0; j < meshes.length; j++) {
                    meshes[j].active = false;
                }
            }
            
            /* Deactivate health bar HUD */
            this.healthHud.active = false;
        }

        /* Destroy zombie, after 3 seconds */
        setTimeout(() => this.object.destroy(), 3000);
    }
}
