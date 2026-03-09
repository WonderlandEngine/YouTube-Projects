import {Component, Property, MeshAttribute} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';

/**
 * use drawLine() function to visualize rayCast
 */
export class DrawLine extends Component {
    static TypeName = 'draw-line';
    /* Properties that are configurable in the editor */
    static Properties = {
        lineThickness: Property.float(0.01), // Thickness of the line
        hitBoxSize: Property.float(0.08), // Size of the hit visualization box
    };

    start() {
        /* Create lineMaterial */
        const PhongMaterial = this.engine.materials.getTemplate('Flat Opaque');
        this.lineMaterialTemplate = new PhongMaterial();
    }

    drawLine(start, end, hitSuccess = false, duration = 1, color = [1, 0, 0, 1]) {
        /* Create a new line material instance and set its color */
        const lineMaterial = this.lineMaterialTemplate.clone();
        lineMaterial.setColor(color);

        /* Convert duration from seconds to milliseconds */
        const durationMs = duration * 1000;

        /* Draw a thin rectangular box to represent the line */
        this.createLineBox(start, end, lineMaterial, durationMs);

        /* Draw a red cube at the success hit point */
        if (hitSuccess) {
            this.spawnHitBox(end, durationMs);
        }
    }

    /* Spawn red cube at hit point for raycast visualization */
    spawnHitBox(position, durationMs = 1000) {
        const hitBox = this.engine.scene.addObject();
        hitBox.setPositionWorld(position);

        const s = this.hitBoxSize; // Shortcut var for size

        // Create a cube mesh
        const vertices = new Float32Array([
            // 0
            -s,
            -s,
            -s,
            // 1
            s,
            -s,
            -s,
            // 2
            s,
            s,
            -s,
            // 3
            -s,
            s,
            -s,
            // 4
            -s,
            -s,
            s,
            // 5
            s,
            -s,
            s,
            // 6
            s,
            s,
            s,
            // 7
            -s,
            s,
            s,
        ]);
        const indices = new Uint16Array([
            // Front face (+Z)
            4, 5, 6, 6, 7, 4,

            // Back face (-Z)
            0, 3, 2, 2, 1, 0,

            // Left face (-X)
            0, 4, 7, 7, 3, 0,

            // Right face (+X)
            1, 2, 6, 6, 5, 1,

            // Top face (+Y)
            3, 7, 6, 6, 2, 3,

            // Bottom face (-Y)
            0, 1, 5, 5, 4, 0,
        ]);

        const cubeMesh = this.engine.meshes.create({
            vertexCount: vertices.length / 3,
            indexData: indices,
        });
        cubeMesh.attribute(MeshAttribute.Position).set(0, vertices);
        cubeMesh.update();

        const redMaterial = this.lineMaterialTemplate.clone();
        redMaterial.setColor([1, 0, 0, 1]);

        hitBox.addComponent('mesh', {
            mesh: cubeMesh,
            material: redMaterial,
        });

        setTimeout(() => {
            hitBox.destroy();
        }, durationMs);
    }

    createLineBox(start, end, rayMat, durationMs) {
        // Calculate the direction vector
        const direction = vec3.create();
        vec3.subtract(direction, end, start);

        // Calculate the length of the direction vector
        const length = vec3.length(direction);

        // Normalize the direction vector
        const directionNormalized = vec3.normalize(vec3.create(), direction);

        // Calculate the half length
        const halfLength = length / 2;

        // Calculate the center point
        const center = vec3.scaleAndAdd(
            vec3.create(),
            start,
            directionNormalized,
            halfLength
        );

        // Create a thin rectangular box to represent the line with thickness
        const boxVertices = new Float32Array([
            // Front face
            -this.lineThickness,
            -this.lineThickness,
            halfLength,
            this.lineThickness,
            -this.lineThickness,
            halfLength,
            this.lineThickness,
            this.lineThickness,
            halfLength,
            -this.lineThickness,
            this.lineThickness,
            halfLength,

            // Back face
            -this.lineThickness,
            -this.lineThickness,
            -halfLength,
            this.lineThickness,
            -this.lineThickness,
            -halfLength,
            this.lineThickness,
            this.lineThickness,
            -halfLength,
            -this.lineThickness,
            this.lineThickness,
            -halfLength,
        ]);

        const boxIndices = new Uint16Array([
            // Front face
            0, 1, 2, 2, 3, 0,
            // Back face
            4, 5, 6, 6, 7, 4,
            // Top face
            3, 2, 6, 6, 7, 3,
            // Bottom face
            0, 1, 5, 5, 4, 0,
            // Right face
            1, 5, 6, 6, 2, 1,
            // Left face
            0, 3, 7, 7, 4, 0,
        ]);

        const boxMesh = this.engine.meshes.create({
            vertexCount: boxVertices.length / 3,
            indexData: boxIndices,
        });

        const boxPositionAttribute = boxMesh.attribute(MeshAttribute.Position);
        boxPositionAttribute.set(0, boxVertices);

        // Move vertex data to the GPU
        boxMesh.update();

        if (!rayMat) {
            console.error('Raycast ray material is not assigned.');
            return;
        }

        // Create a new object and add the mesh component for the box
        const boxObject = this.engine.scene.addObject();
        boxObject.addComponent('mesh', {
            mesh: boxMesh,
            material: rayMat,
        });

        // Position the box object at the center position
        boxObject.setPositionWorld(center);

        // Set the rotation to align the box with the direction
        const rotation = this.calculateRotation(start, end);
        boxObject.setRotationWorld(rotation);

        // Destroy the box object after a certain delay (e.g., 1 second)
        setTimeout(() => {
            boxObject.destroy();
        }, durationMs);

        return boxObject;
    }

    calculateRotation(start, end) {
        const direction = vec3.create();
        vec3.subtract(direction, end, start);

        const forward = vec3.fromValues(0, 0, 1);
        const axis = vec3.cross(vec3.create(), forward, direction);
        vec3.normalize(axis, axis);

        const dot = vec3.dot(forward, direction);
        const angle = Math.acos(dot / vec3.length(direction));

        const halfAngle = angle / 2;
        const sinHalfAngle = Math.sin(halfAngle);

        return [
            axis[0] * sinHalfAngle,
            axis[1] * sinHalfAngle,
            axis[2] * sinHalfAngle,
            Math.cos(halfAngle),
        ];
    }
}
