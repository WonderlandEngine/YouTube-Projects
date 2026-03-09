import {Component, Property, CollisionEventType} from '@wonderlandengine/api';

/**
 * test-trigger
 */
export class TestTrigger extends Component {
    static TypeName = 'test-trigger';
    /* Properties that are configurable in the editor */
    static Properties = {
        param: Property.float(1.0),
    };

    start() {
        /* Attach collision listener */
        this.rigidBody = this.object.getComponent('physx');
        this.rigidBody.onCollision((type, other) => {
            if (
                type === CollisionEventType.Touch ||
                type === CollisionEventType.TriggerTouch
            ) {
                this.onCollisionBegin(type, other);
            }
        });
    }

    onCollisionBegin(type, other) {
        console.log('[test-trigger] Collision:', type, other.object.name);
    }
}
