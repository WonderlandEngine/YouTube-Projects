import {Component, Property} from '@wonderlandengine/api';
import {quat2} from 'gl-matrix';

const tempQuat2 = quat2.create();

/**
 * zombie-spawner
 * Loads and spawns zombies from GLTF file
 */
export class ZombieSpawner extends Component {
    static TypeName = 'zombie-spawner';
    /* Properties that are configurable in the editor */
    static Properties = {
        player: Property.object(),
        spawnCount: Property.int(0), // Number of zombies to spawn (0 = infinite)
        minSpawnTime: Property.float(10.0), // Minimum time between spawns (seconds)
        maxSpawnTime: Property.float(30.0), // Maximum time between spawns (seconds)
    };

    async start() {
        /* Load the prefab file */
        this.prefab = await this.engine.loadPrefab('ZombieCharacter.bin');
        
        /* Spawning state */
        this.spawnedCount = 0;
        this.timeUntilNextSpawn = 0;
        this.setNextSpawnTime();

        /* Hide the mesh of the spawner, at the start of the game */
        this.object.getComponents('mesh')[0].active = false;
    }

    update(dt) {
        /* Check if we need to spawn more zombies */
        /* If spawnCount is 0, spawn infinitely */
        const shouldSpawn = this.spawnCount === 0 || this.spawnedCount < this.spawnCount;
        
        if (shouldSpawn) {
            this.timeUntilNextSpawn -= dt;
            
            if (this.timeUntilNextSpawn <= 0) {
                this.spawnZombie();
                this.setNextSpawnTime();
            }
        }
    }

    /* Set random spawn time between min and max */
    setNextSpawnTime() {
        const range = this.maxSpawnTime - this.minSpawnTime;
        this.timeUntilNextSpawn = this.minSpawnTime + Math.random() * range;
    }

    /* Spawn a single zombie */
    spawnZombie() {
        /* Instantiate the prefab */
        const result = this.engine.scene.instantiate(this.prefab);
        const newZombie = result.root.children[0];
        
        /* Position at spawner location */
        newZombie.setTransformWorld(this.object.getTransformWorld(tempQuat2));
        
        /* Activate the zombie */
        newZombie.active = true;
        
        /* Set player reference in zombie component */
        const zombieComponent = newZombie.getComponent('zombie');
        if (zombieComponent) {
            zombieComponent.player = this.player;
        }

        /* console log */
        console.log('Spawned zombie');
        
        /* Increment spawned count */
        this.spawnedCount++;
    }
}
