import {Component, Property} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';

// Initialize position and direction
const position = vec3.create();
const direction = vec3.create();

/**
 * raycast-forward
 * Example of raycast in the forward direction, and using DrawLine component for raycast visualization
 */
export class RaycastForward extends Component {
    static TypeName = 'raycast-forward';
    /* Properties that are configurable in the editor */
    static Properties = {};

    start() {
        // Reference to the DrawLine component
        this.drawLine = this.object.getComponent('draw-line');

        if (!this.drawLine) {
            console.error('DrawLine component not found on this object.');
        }
    }

    update(dt) {
        if (this.drawLine) {
            this.rayCastForward();
        }
    }

    rayCastForward() {
        // Get the current position and direction
        this.object.getPositionWorld(position);
        this.object.getForwardWorld(direction);

        // Adjust the starting position on Y axis & length of the ray
        position[1] += 0.15;
        const rayLength = 100.0;

        // Calculate the end point of the ray
        const endPoint = [
            position[0] + direction[0] * rayLength,
            position[1] + direction[1] * rayLength,
            position[2] + direction[2] * rayLength,
        ];

        // Perform the raycast
        const hit = this.engine.physics.rayCast(position, direction, rayLength);

        let hitSomething = false;
        let hitPoint = endPoint;

        // Check if anything was hit within the ray length, except self
        if (hit.hitCount > 0) {
            for (let i = 0; i < hit.hitCount; ++i) {
                if (hit.objects[i].name !== this.object.name) {
                    console.log('hit: ', hit.objects[i].name);
                    hitSomething = true;
                    hitPoint = hit.locations[i];
                    break;
                }
            }
        }

        // Visualize the rayCast
        const color = hitSomething ? [0.0, 1.0, 0.0, 1.0] : [1.0, 0.0, 0.0, 1.0]; // Green if hit, red if not
        this.drawLine.drawLine(position, hitPoint, color);
    }
}
