/**
 * /!\ This file is auto-generated.
 *
 * This is the entry point of your standalone application.
 *
 * There are multiple tags used by the editor to inject code automatically:
 *     - `wle:auto-imports:start` and `wle:auto-imports:end`: The list of import statements
 *     - `wle:auto-register:start` and `wle:auto-register:end`: The list of component to register
 */

/* wle:auto-imports:start */
import {MouseLookComponent} from '@wonderlandengine/components';
import {CarController3} from './car-controller3.js';
import {DrawLine} from './draw-line.js';
import {ThirdpersonCamera} from './thirdperson-camera.js';
/* wle:auto-imports:end */

export default function(engine) {
/* wle:auto-register:start */
engine.registerComponent(MouseLookComponent);
engine.registerComponent(CarController3);
engine.registerComponent(DrawLine);
engine.registerComponent(ThirdpersonCamera);
/* wle:auto-register:end */
}
