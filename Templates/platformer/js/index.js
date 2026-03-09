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
import {PlayerHeight} from '@wonderlandengine/components';
import {TeleportComponent} from '@wonderlandengine/components';
import {VrModeActiveSwitch} from '@wonderlandengine/components';
import {AnimationController} from './animation-controller.js';
import {DrawLine} from './debugs/draw-line.js';
import {RaycastForward} from './debugs/raycast-forward.js';
import {JumpPad} from './jump-pad.js';
import {MovingPlatform} from './moving-platform.js';
import {Player} from './player.js';
import {Spikes} from './spikes.js';
import {TpsMovement} from './tps-movement.js';
import {WinPlatform} from './win-platform.js';
/* wle:auto-imports:end */

export default function(engine) {
/* wle:auto-register:start */
engine.registerComponent(AudioListener);
engine.registerComponent(Cursor);
engine.registerComponent(FingerCursor);
engine.registerComponent(HandTracking);
engine.registerComponent(PlayerHeight);
engine.registerComponent(TeleportComponent);
engine.registerComponent(VrModeActiveSwitch);
engine.registerComponent(AnimationController);
engine.registerComponent(DrawLine);
engine.registerComponent(RaycastForward);
engine.registerComponent(JumpPad);
engine.registerComponent(MovingPlatform);
engine.registerComponent(Player);
engine.registerComponent(Spikes);
engine.registerComponent(TpsMovement);
engine.registerComponent(WinPlatform);
/* wle:auto-register:end */
}
