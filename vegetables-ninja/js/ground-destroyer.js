import {Component, Property, CollisionEventType} from '@wonderlandengine/api';

/**
 * ground-destroyer
 */
export class GroundDestroyer extends Component {
    static TypeName = 'ground-destroyer';
    /* Properties that are configurable in the editor */
    static Properties = {
    };

    start() {
        /* Physx Collision */
        this.object.getComponent('physx').onCollision((type, other) => {
            /* onCollision Begin */
            if(type == CollisionEventType.Touch) {
                this.onCollision(other);
            }
        });
    }

    onCollision(other) {
        setTimeout(() => {
            other.object.getComponent('physx').kinematic = false;
            other.object.getComponent('physx').destroy();
            other.object.getComponent('mesh').destroy();
        }, 0);
           
    }
}
