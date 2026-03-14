import {Component, Property, Shape, CollisionEventType} from '@wonderlandengine/api';
import {Trail} from '@wonderlandengine/components';
import {vec3} from 'gl-matrix';

/**
 * bullet
 */
export class Bullet extends Component {
    static TypeName = 'bullet';
    /* Properties that are configurable in the editor */
    static Properties = {
        bulletMesh: Property.mesh(), // Mesh for the bullet
        bulletMaterial: Property.material(), // Material for the bullet
        poolSize: Property.int(10), // Number of bullets in the pool
        lifeTime: Property.float(5.0), // Time before bullet is recycled
        decalMesh: Property.mesh(), // Mesh for the bullet decal
        decalMaterial: Property.material(), // Material for the bullet decal
    };

    /* Gets called on game start */
    start() {
        /* Array to store individual bullet objects */
        this.bulletPool = []; // Pool of bullets
        this.activeBullets = []; // Track active bullets that need to be updated

        /* Create the bullet pool */
        for (let i = 0; i < this.poolSize; i++) {
            /* Create a new object for each bullet */
            const bullet = this.engine.scene.addObject();

            // Add mesh and material to bullet
            bullet.addComponent('mesh', {
                mesh: this.bulletMesh,
                material: this.bulletMaterial,
            });

            // Scale the bullet object
            bullet.setScalingWorld([0.05, 0.05, 0.05]);

            // Move bullet away from visible area
            bullet.setPositionWorld([0, -10, 0]);

            // Add physx component
            bullet.addComponent('physx', {
                shape: Shape.Sphere, // Sphere
                extents: [0.05, 0.05, 0.05], // Same size as the mesh
                kinematic: true, // To be able to control its position
            });

            // Attach collision listener
            const rigidBody = bullet.getComponent('physx');
            rigidBody.onCollision((type, other) => {
                if (type === CollisionEventType.Touch) {
                    this.onCollisionBegin(bullet, other);
                }
            });

            // Add trail
            bullet.addComponent(Trail, {
                material: this.bulletMaterial,
                segments: 5,
                interval: 0.01,
                width: 0.125,
            });

            /* Deactivate bullet & add to pool */
            bullet.active = false;
            this.bulletPool.push(bullet);
        }
    }

    /* Gets called every frame */
    update(dt) {
        /* Update active bullets */
        for (let i = this.activeBullets.length - 1; i >= 0; i--) {
            const bullet = this.activeBullets[i];
            bullet.timeAlive += dt;

            // Move the bullet forward
            const movement = vec3.create();
            vec3.scale(movement, bullet.direction, bullet.speed * dt);
            bullet.translateWorld(movement);

            // Recycle bullet after being marked or after lifetime
            if (bullet.shouldRecycle || bullet.timeAlive >= this.lifeTime) {
                this.recycleToPool(bullet);
            }
        }
    }

    /* Gets a bullet from the pool */
    getFromPool(trailStartPos) {
        // Check if there are bullets in the pool
        if (this.bulletPool.length > 0) {
            // Get the first bullet from the pool & activate it
            const bullet = this.bulletPool.pop();
            bullet.active = true;
            bullet.shouldRecycle = false; // Reset the recycle flag when reusing bullet

            // Reset trail before activating
            bullet.setPositionWorld(trailStartPos); // Bullet start position for the trail
            bullet.getComponent(Trail).resetTrail(); // Reset the trail to the new position

            // Add to active list for updates
            this.activeBullets.push(bullet);
            return bullet;
        } else {
            // If there are no bullets in the pool, return null
            return null;
        }
    }

    /* Recycles a bullet to the pool */
    recycleToPool(bullet) {
        // Remove bullet from active list first
        this.activeBullets = this.activeBullets.filter((b) => b !== bullet);

        // Disable bullet and physx
        bullet.active = false;
        const rigidBody = bullet.getComponent('physx');
        if (rigidBody) rigidBody.active = false;

        // Move bullet away from visible area
        bullet.setPositionWorld([0, -10, 0]);

        // Return bullet to the pool
        this.bulletPool.push(bullet);
    }

    /* Sets the direction of the bullet */
    setDirection(bullet, dir, speed) {
        /* Move and manage individual bullet objects */
        const direction = vec3.create();
        vec3.copy(direction, dir);
        bullet.direction = direction;
        bullet.speed = speed;
        bullet.timeAlive = 0;
    }

    /* Signal the weapon that the bullet has hit something */
    onCollisionBegin(bullet, other) {
        this.object.getComponent('weapon')?.onBulletHit(bullet, other);
    }

    /* Creates a bullet decal at the collision point */
    createBulletDecal(bullet) {
        const hitPosition = bullet.getPositionWorld(); // Get the hit position of the bullet
        const decal = this.engine.scene.addObject(); // Create a new object for the decal
        decal.setPositionWorld(hitPosition); // Set the position of the decal
        decal.setScalingWorld([0.05, 0.05, 0.05]); // Adjust size of decal if needed
        decal.addComponent('mesh', {
            mesh: this.decalMesh, // Use a bullet-hole mesh if available
            material: this.decalMaterial, // Or a bullet-hole material
        });
    }
}
