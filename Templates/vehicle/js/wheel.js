import {Component, Property} from '@wonderlandengine/api';

/**
 * wheel
 */
export class Wheel extends Component {
    static TypeName = 'wheel';
    /* Properties that are configurable in the editor */
    static Properties = {
        param: Property.float(1.0)
    };

    start() {
        console.log('start() with param', this.param);
    }

    update(dt) {
        /* Called every frame. */
    }
}
