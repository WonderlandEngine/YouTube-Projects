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
import {AudioListener} from '@wonderlandengine/components';
import {Cursor} from '@wonderlandengine/components';
import {FingerCursor} from '@wonderlandengine/components';
import {HandTracking} from '@wonderlandengine/components';
import {MouseLookComponent} from '@wonderlandengine/components';
import {PlayerHeight} from '@wonderlandengine/components';
import {TeleportComponent} from '@wonderlandengine/components';
import {Trail} from '@wonderlandengine/components';
import {VrModeActiveSwitch} from '@wonderlandengine/components';
import {AnimationController} from './animation-controller.js';
import {DrawLine} from './debugs/draw-line.js';
import {RaycastForward} from './debugs/raycast-forward.js';
import {Health} from './scarecrow/health.js';
import {Scarecrow} from './scarecrow/scarecrow.js';
import {TestTrigger} from './test-trigger.js';
import {ThirdpersonCamera} from './thirdperson-camera.js';
import {TpsMovement} from './tps-movement.js';
import {Bullet} from './weapons/bullet.js';
import {ChangeWeaponPositionOnAction} from './weapons/change-weapon-position-on-action.js';
import {Hud} from './weapons/hud.js';
import {PlayerWeaponManager} from './weapons/player-weapon-manager.js';
import {Weapon} from './weapons/weapon.js';
/* wle:auto-imports:end */

export default function(engine) {
/* wle:auto-register:start */
engine.registerComponent(AudioListener);
engine.registerComponent(Cursor);
engine.registerComponent(FingerCursor);
engine.registerComponent(HandTracking);
engine.registerComponent(MouseLookComponent);
engine.registerComponent(PlayerHeight);
engine.registerComponent(TeleportComponent);
engine.registerComponent(Trail);
engine.registerComponent(VrModeActiveSwitch);
engine.registerComponent(AnimationController);
engine.registerComponent(DrawLine);
engine.registerComponent(RaycastForward);
engine.registerComponent(Health);
engine.registerComponent(Scarecrow);
engine.registerComponent(TestTrigger);
engine.registerComponent(ThirdpersonCamera);
engine.registerComponent(TpsMovement);
engine.registerComponent(Bullet);
engine.registerComponent(ChangeWeaponPositionOnAction);
engine.registerComponent(Hud);
engine.registerComponent(PlayerWeaponManager);
engine.registerComponent(Weapon);
/* wle:auto-register:end */
}
