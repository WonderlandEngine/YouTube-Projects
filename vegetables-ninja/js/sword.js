import {Component, Property, CollisionEventType} from '@wonderlandengine/api';
import {HowlerAudioSource} from '@wonderlandengine/components';

/**
 * sword
 */
export class Sword extends Component {
    static TypeName = 'sword';
    /* Properties that are configurable in the editor */
    static Properties = {
        player: Property.object(),
        trailObj: Property.object(),
        greenBurstMat: Property.material(),
        redBurstMat: Property.material(),
    };

    start() {
        /* SFX */
        this.bombExplodeSmall = this.object.addComponent(HowlerAudioSource, {
            src: 'sfx/Bomb-Explode-Small.wav',
            spatial: true,
        });
        this.bombExplodeBig = this.object.addComponent(HowlerAudioSource, {
            src: 'sfx/Bomb-Explode-Big.wav',
            spatial: true,
        });
        this.slash = this.object.addComponent(HowlerAudioSource, {
            src: 'sfx/Slash.wav',
            spatial: true,
        });

        /* Physx Collision */
        this.object.getComponent('physx').onCollision((type, other) => {
            /* onCollision Begin */
            this.onCollision(other);
        });
    }

    onCollision(other) {
        /* Trail Particle */
        this.trailObj.getComponent('trail').resetThreshold = 0.5; //Start trail
        setTimeout(() => (this.trailObj.getComponent('trail').resetThreshold = 0), 500); //End trail after 0.5sec

        /* The sword hitted the child or parent vegetable? Either case we want to control the child */
        let vegetableChild = other.object.children[0] || other.object;

        if (vegetableChild) {
            /* Ignore additional hits */
            if (vegetableChild.name == 'AlreadyHit') return;

            /* If Bomb */
            if (vegetableChild.name == 'Bomb') {
                /* Call player's bombHit */
                this.player.getComponent('player').bombHit();

                /* Burst Particle */
                this.object.getComponent('burst-mesh-particles').spawnObjLocation =
                    other.object;
                this.object.getComponent('burst-mesh-particles').time = 0;
                this.object
                    .getComponent('burst-mesh-particles')
                    .changeMaterial(this.redBurstMat);
                this.object.getComponent('burst-mesh-particles').spawn();

                /* Bomb SFX */
                if (this.bombHits > 2) {
                    this.bombExplodeBig.play();
                } else {
                    this.bombExplodeSmall.play();
                }

                /* Ignore additional hits */
                vegetableChild.name = 'AlreadyHit';
            } else {
                /* Cut the vegetable, by unparenting it & adding force */
                let scale = vegetableChild.getScalingWorld(); /* Save Scale Temporarily */
                let vegetableOldParent =
                    vegetableChild.parent; /* Save Parent Temporarily */
                vegetableChild.parent = null; /* Unparent */
                vegetableChild.setScalingWorld(scale); /* Reset Scale back */
                vegetableChild.getComponent('physx').kinematic = false;
                vegetableChild.getComponent('physx').addForce([-100, 0, -100]);

                /* Burst Particle */
                this.object.getComponent('burst-mesh-particles').spawnObjLocation =
                    other.object;
                this.object.getComponent('burst-mesh-particles').time = 0;
                this.object
                    .getComponent('burst-mesh-particles')
                    .changeMaterial(this.greenBurstMat);
                this.object.getComponent('burst-mesh-particles').spawn();

                /* Slash SFX */
                this.slash.play();

                /* Add Score */
                this.player.getComponent('player').increaseScore();

                /* Ignore additional hits */
                vegetableOldParent.name = 'AlreadyHit';
                vegetableChild.name = 'AlreadyHit';
            }
        }
    }
}
