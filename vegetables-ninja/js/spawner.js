import {Component, Property} from '@wonderlandengine/api';
import {HowlerAudioSource} from '@wonderlandengine/components';

/**
 * spawner
 */
export class Spawner extends Component {
    static TypeName = 'spawner';
    /* Properties that are configurable in the editor */
    static Properties = {
        player: Property.object(),
        /* Broccoli */
        broccoliRight: Property.mesh(),
        broccoliLeft: Property.mesh(),
        broccoliMaterial: Property.material(),
        /* Carrot */
        carrotRight: Property.mesh(),
        carrotLeft: Property.mesh(),
        carrotMaterial: Property.material(),
        /* Pepper */
        pepperRight: Property.mesh(),
        pepperLeft: Property.mesh(),
        pepperMaterial: Property.material(),
        /* Pumpkin */
        pumpkinRight: Property.mesh(),
        pumpkinLeft: Property.mesh(),
        pumpkinMaterial: Property.material(),
        /* Bomb */
        bombMesh: Property.mesh(),
        bombMaterial: Property.material(),
    };

    start() {
        /* SFX */
        this.vegetableThrow = this.object.addComponent(HowlerAudioSource, {
            src: 'sfx/Throw-Vegetable.wav',
            spatial: true,
        });
        this.bombThrow = this.object.addComponent(HowlerAudioSource, {
            src: 'sfx/Throw-Bomb.wav',
            spatial: true,
        });

        /* Random Spawner */
        this.scheduleRandomSpawn();
    }

    selectRandomVegetable() {
        const vegetableMeshesRight = [
            this.broccoliRight,
            this.carrotRight,
            this.pepperRight,
            this.pumpkinRight,
            this.bombMesh,
        ];
        const vegetableMeshesLeft = [
            this.broccoliLeft,
            this.carrotLeft,
            this.pepperLeft,
            this.pumpkinLeft,
        ];
        const vegetableMaterials = [
            this.broccoliMaterial,
            this.carrotMaterial,
            this.pepperMaterial,
            this.pumpkinMaterial,
            this.bombMaterial,
        ];
        const vegetablePhysxExtents = [
            [0.36, 0.53, 0.25],
            [0.85, 0.25, 0.25],
            [0.55, 0.5, 0.25],
            [0.44, 0.4, 0.25],
            [0.21, 0.22, 0.22],
        ];

        /* Randomly select a vegetable index */
        this.randomIndex = Math.floor(Math.random() * vegetableMaterials.length);

        /* Change the vegetable Mesh & material, based on index */
        this.vegetableMeshRight = vegetableMeshesRight[this.randomIndex];
        this.vegetableMeshLeft = vegetableMeshesLeft[this.randomIndex];
        this.vegetableMaterial = vegetableMaterials[this.randomIndex];

        /* Change the Physx Extent & Translation */
        this.vegetablePhysxExtent = vegetablePhysxExtents[this.randomIndex];
    }

    scheduleRandomSpawn() {
        /* Random Seconds */
        const minSeconds = 2000; // 2 seconds
        const maxSeconds = 5000; // 5 seconds
        const randomSeconds =
            Math.floor(Math.random() * (maxSeconds - minSeconds)) + minSeconds;

        /* Random Y Force */
        const minForce = 700;
        const maxForce = 1000;
        const randomForce = Math.floor(Math.random() * (maxForce - minForce)) + minForce;

        /* Random Torque Rotation */
        const minTorque = -100;
        const maxTorque = 100;
        const randomTorque =
            Math.floor(Math.random() * (maxTorque - minTorque)) + minTorque;

        /* Spawn after delay */
        setTimeout(() => {
            this.spawn(randomForce, randomTorque);
            this.scheduleRandomSpawn();
        }, randomSeconds);
    }

    spawn(randomForce, randomTorque) {
        /* Don't spawn if GameOver */
        if (this.player.getComponent('player').isGameOver) return;

        /* Select Random Vegetable */
        this.selectRandomVegetable();

        /* Select to spawn Bomb or Vegetable */
        if (this.randomIndex == 4) {
            this.spawnBomb();
        } else {
            this.spawnVegetable();
        }

        /* Add Force */
        this.spawnedVegetable.getComponent('physx').addForce([0, randomForce, 0]);
        this.spawnedVegetable
            .getComponent('physx')
            .addTorque([randomTorque, randomTorque, randomTorque]);
    }

    spawnBomb() {
        /* Spawn Bomb Object */
        this.spawnedVegetable = this.engine.scene.addObject(this.object);
        this.spawnedVegetable.name = 'Bomb';
        this.spawnedVegetable.addComponent('mesh', {
            mesh: this.vegetableMeshRight,
            material: this.vegetableMaterial,
        });
        this.spawnedVegetable.addComponent('physx', {
            shape: 3,
            extents: this.vegetablePhysxExtent,
            gravity: true,
            kinematic: false,
            /* Physx masks to not interact with other fruits */
            groupsMask: 128,
            blocksMask: 127,
        });

        /* SFX */
        this.vegetableThrow.play();
    }

    spawnVegetable() {
        /* Spawn Vegetable Object */
        this.spawnedVegetable = this.engine.scene.addObject(this.object);
        this.spawnedVegetable.addComponent('mesh', {
            mesh: this.vegetableMeshRight,
            material: this.vegetableMaterial,
        });
        this.spawnedVegetable.addComponent('physx', {
            shape: 3,
            extents: this.vegetablePhysxExtent,
            gravity: true,
            kinematic: false,
            /* Physx masks to not interact with other fruits */
            groupsMask: 128,
            blocksMask: 127,
        });

        /* Create child object (The other half of the vegetable) */
        this.spawnedVegetableChild = this.engine.scene.addObject(this.spawnedVegetable);
        this.spawnedVegetableChild.addComponent('mesh', {
            mesh: this.vegetableMeshLeft,
            material: this.vegetableMaterial,
        });
        this.spawnedVegetableChild.addComponent('physx', {
            shape: 3,
            extents: this.vegetablePhysxExtent,
            gravity: true,
            kinematic: true,
            /* Physx masks to not interact with other fruits */
            groupsMask: 128,
            blocksMask: 127,
        });

        /* Bomb Spawn SFX */
        this.bombThrow.play();
    }
}
