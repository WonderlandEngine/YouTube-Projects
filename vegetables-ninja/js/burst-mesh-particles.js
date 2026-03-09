import {Component, Property} from '@wonderlandengine/api';
import {vec3, quat2} from 'gl-matrix';

/**
A simple mesh particles system

Demostrates spawning of new objects with components
and a simple pooling pattern.

Use it and customize it for your own game.
**/
/** A Burst Particles, that gets called like this:
        this.object.getComponent('burst-mesh-particles').changeMaterial('newMaterial');
        this.object.getComponent('burst-mesh-particles').spawnObjLocation = this.object;
        this.object.getComponent('burst-mesh-particles').time = 0; //Reset timer that will hide particles
        this.object.getComponent('burst-mesh-particles').spawn();
**/
export class BurstMeshParticles extends Component {
    static TypeName = 'burst-mesh-particles';
    /* Properties that are configurable in the editor */
    static Properties = {
        /* Auto start the burst particle on game start? */
        autoStart: Property.bool(false),
        /* Mesh for spawned particles */
        mesh: Property.mesh(),
        /* Material for spawned particles */
        material: Property.material(),
        /* Delay between particle spawns. If below time of a frame, will spawn multiple particles in update. */
        delay: Property.float(5.0),
        /* Maximum number of particles, once limit is reached, particles are recycled first-in-first-out. */
        maxParticles: Property.int(64),
        /* Initial speed of emitted particles. */
        initialSpeed: Property.float(5),
        /* Size of a particle */
        particleScale: Property.float(0.1),

        /* Added Spawn on choosen Object Location, if Object is not null */
        spawnObjLocation: Property.object(),
        /* Gravity */
        gravity: Property.float(9.81),
    };

    init() {
        this.time = 0.0;
        this.count = 0;
    }

    start() {
        this.objects = [];
        this.velocities = [];

        this.objects = WL.scene.addObjects(this.maxParticles, null, this.maxParticles);

        for (let i = 0; i < this.maxParticles; ++i) {
            this.velocities.push([0, 0, 0]);
            let obj = this.objects[i];
            obj.name = 'particle' + this.count.toString();
            let mesh = obj.addComponent('mesh');

            mesh.mesh = this.mesh;
            mesh.material = this.material;
            /* Most efficient way to hide the mesh */
            obj.scale([0, 0, 0]);
        }

        if (this.autoStart) {
            this.time = 0;
            this.spawn();
        }
    }

    changeMaterial(mat) {
        /* Called to Change the Material of the Particles */
        for (let o of this.objects) {
            o.getComponent('mesh').material = mat;
        }
    }

    update(dt) {
        this.time += dt;

        /* Hide Spawned Particles after Delay Timer*/
        if (this.time > this.delay) {
            for (let i = 0; i < this.maxParticles; ++i) {
                let obj = this.objects[i];
                obj.scale([0, 0, 0]);
            }
            this.time -= this.delay;
        }

        /* Target for retrieving particles world locations */
        let origin = [0, 0, 0];
        let distance = [0, 0, 0];
        for (let i = 0; i < Math.min(this.count, this.objects.length); ++i) {
            /* Get translation first, as object.translate() will mark
             * the object as dirty, which will cause it to recalculate
             * obj.transformWorld on access. We want to avoid this and
             * have it be recalculated in batch at the end of frame
             * instead */
            quat2.getTranslation(origin, this.objects[i].transformWorld);

            /* Apply gravity */
            const vel = this.velocities[i];
            vel[1] -= this.gravity * dt;

            /* Check if particle would collide - if you want to limit particles to ground 0 Y axis */
            // if((origin[1] + vel[1]*dt) <= this.particleScale && vel[1] <= 0) {
            //     /* Pseudo friction */
            //     const frict = 1/(1 - vel[1]);
            //     vel[0] = frict*vel[0];
            //     vel[2] = frict*vel[2];

            //     /* Reflect */
            //     vel[1] = -0.6*vel[1];
            //     if(vel[1] < 0.6) vel[1] = 0;
            // }
        }

        for (let i = 0; i < Math.min(this.count, this.objects.length); ++i) {
            /* Apply velocity */
            vec3.scale(distance, this.velocities[i], dt);
            this.objects[i].translate(distance);
        }
    }

    /* Spawn a particle */
    spawn() {
        for (let i = 0; i < this.maxParticles; ++i) {
            let index = this.count % this.maxParticles;

            let obj = this.objects[index];
            obj.resetTransform();
            obj.scale([this.particleScale, this.particleScale, this.particleScale]);

            /* Activate component, otherwise it will not show up! */
            obj.getComponent('mesh').active = true;

            const origin = [0, 0, 0];
            if (this.spawnObjLocation != null) {
                /* Added Spawn on Choosen Object Location instead of self if not null */
                quat2.getTranslation(origin, this.spawnObjLocation.transformWorld);
            } else {
                quat2.getTranslation(origin, this.object.transformWorld);
            }
            obj.translate(origin);

            this.velocities[index][0] = Math.random() - 0.5;
            this.velocities[index][1] = Math.random();
            this.velocities[index][2] = Math.random() - 0.5;

            vec3.normalize(this.velocities[index], this.velocities[index]);
            vec3.scale(this.velocities[index], this.velocities[index], this.initialSpeed);

            this.count += 1;
        }
    }
}
