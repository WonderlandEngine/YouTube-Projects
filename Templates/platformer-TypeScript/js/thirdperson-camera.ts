import {Component, Object3D, property, Property} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';
import {TpsMovement} from './tps-movement.js';

/* Record Classes */
class OrbitSettings {
    @property.float(5.0)
    orbitDistance!: number; // Default camera distance from player

    @property.float(1.5)
    verticalOffset!: number; // How high above the player to look

    @property.float(0.5)
    horizontalOffset!: number; // How far to the side of the player
}

class SensitivitySettings {
    @property.float(0.3)
    rotationSpeed!: number; // Speed of camera rotation

    @property.float(0.3)
    verticalSensitivity!: number; // Pitch speed

    @property.float(0.8)
    horizontalSensitivity!: number; // Yaw speed
}

class ZoomSettings {
    @property.bool(false)
    enableZoom!: boolean; // Enable/disable zoom with scroll (⚠️Doesn't work with "enableAim")

    @property.float(0.2)
    zoomSpeed!: number; // How fast zoom changes with scroll

    @property.float(2.0)
    minDistance!: number; // Minimum zoom distance

    @property.float(10.0)
    maxDistance!: number; // Maximum zoom distance
}

class PitchClampSettings {
    @property.float(30.0)
    minPitchAngle!: number; // degrees (downward limit)

    @property.float(75.0)
    maxPitchAngle!: number; // degrees (upward limit)
}

class AimSettings {
    @property.bool(true)
    enableAim!: boolean; // Enable/disable right-click aim mode

    @property.float(2.0)
    aimZoomDistance!: number; // Camera zoom distance when aiming

    @property.float(100.0)
    aimZoomSpeed!: number; // How fast zoom changes when aiming

    @property.float(-15.0)
    aimRotateOffset!: number; // How much degrees to rotate player to the right when aiming
}

class CrosshairSettings {
    @property.string('./images/crosshair-default.png')
    crosshairDefault!: string; // Set this to your crosshair static image path (ex: './images/crosshair.png')

    @property.float(32.0)
    crosshairSize!: number; // 📏 Default width/height in pixels

    @property.float(2.0)
    crosshairMaxScale!: number; // 🔼 Max size it can grow

    @property.float(0.15)
    crosshairGrowAmount!: number; // ➕ How much it grows per shot

    @property.float(1.5)
    crosshairDecaySpeed!: number; // 🔻 How fast it shrinks back
}

/**
 * Third Person Camera Component
 * Handles camera movement, aiming, and crosshair management.
 * Simple and beginner-friendly implementation
 */
export class ThirdpersonCamera extends Component {
    static TypeName = 'thirdperson-camera';

    /* Properties configurable in the editor */
    @property.object()
    player!: Object3D; // The parent player

    @property.object()
    playerArmature!: Object3D; // The object to orbit around (usually the player's armature)

    @property.object()
    playerSpine!: Object3D; // The spine bone of the player, used for vertical aiming (Prefer empty spine parent "spineAimOffset")

    @property.record(OrbitSettings)
    orbit!: OrbitSettings; // Orbit settings

    @property.record(SensitivitySettings)
    sensitivity!: SensitivitySettings; // Sensitivity settings

    @property.record(ZoomSettings)
    zoom!: ZoomSettings; // Zoom settings

    @property.record(PitchClampSettings)
    pitchClamp!: PitchClampSettings; // Pitch clamp settings

    @property.record(AimSettings)
    aim!: AimSettings; // Aim settings

    @property.record(CrosshairSettings)
    crosshairConfig!: CrosshairSettings; // Crosshair settings

    /* Camera rotation values */
    private yaw = 0;
    private pitch = (15 * Math.PI) / 180;

    /* Mouse movement tracking */
    private mouseX = 0;
    private mouseY = 0;

    /* Vectors for calculations */
    private tempVec = vec3.create();
    private targetPos = vec3.create();

    /* State flags */
    private isAiming = false;
    private isFiring = false;

    /* Crosshair management */
    private crosshair: HTMLImageElement | null = null;
    private crosshairScale = 1;
    private crosshairMaxScale = 2.0;
    private crosshairDecaySpeed = 1.5;
    private crosshairGrowAmount = 0.15;

    /* Zoom management */
    private defaultOrbitDistance: number | undefined = undefined;

    /* Gets called on game start */
    start() {
        // Initialize crosshair settings from config
        this.crosshairMaxScale = this.crosshairConfig.crosshairMaxScale;
        this.crosshairDecaySpeed = this.crosshairConfig.crosshairDecaySpeed;
        this.crosshairGrowAmount = this.crosshairConfig.crosshairGrowAmount;

        // Create crosshair image from provided image url
        if (this.crosshairConfig.crosshairDefault) {
            this._createCrosshair();
        }
    }

    /* Called when component is activated */
    onActivate() {
        // Pointer lock click
        this.engine.canvas.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                this.engine.canvas.requestPointerLock();
            }
        });

        // Input listeners
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('wheel', this._onWheel, {passive: false});
    }

    /* Called when component is deactivated */
    onDeactivate() {
        // Remove input listeners
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('wheel', this._onWheel);
    }

    /* Gets called every frame */
    update(dt: number) {
        if (!this.playerArmature) return;

        // Aim
        this.applyAim(dt);

        // Apply mouse movement to yaw/pitch
        if (document.pointerLockElement === this.engine.canvas) {
            this.yaw -=
                this.mouseX *
                this.sensitivity.horizontalSensitivity *
                this.sensitivity.rotationSpeed *
                dt;
            this.pitch +=
                this.mouseY *
                this.sensitivity.verticalSensitivity *
                this.sensitivity.rotationSpeed *
                dt;

            // Clamp pitch
            const maxPitch = (this.pitchClamp.maxPitchAngle * Math.PI) / 180;
            const minPitch = (-this.pitchClamp.minPitchAngle * Math.PI) / 180;
            this.pitch = Math.max(minPitch, Math.min(maxPitch, this.pitch));
        }

        // Reset deltas
        this.mouseX = 0;
        this.mouseY = 0;

        // Get target position and offset Y
        this.playerArmature.getPositionWorld(this.targetPos);
        this.targetPos[1] += this.orbit.verticalOffset;

        // Apply horizontal offset
        this.targetPos[0] += this.orbit.horizontalOffset * Math.cos(this.yaw);
        this.targetPos[2] -= this.orbit.horizontalOffset * Math.sin(this.yaw);

        // Calculate orbit camera position
        const x = this.orbit.orbitDistance * Math.sin(this.yaw) * Math.cos(this.pitch);
        const y = this.orbit.orbitDistance * Math.sin(this.pitch);
        const z = this.orbit.orbitDistance * Math.cos(this.yaw) * Math.cos(this.pitch);

        // Set the temporary vector
        vec3.set(
            this.tempVec,
            this.targetPos[0] + x,
            this.targetPos[1] + y,
            this.targetPos[2] + z
        );

        // Move camera and look at player
        this.object.setPositionWorld(this.tempVec);
        this.object.lookAt(this.targetPos);

        // Smoothly shrink crosshair scale back to default
        this.shrinkCrosshairScale(dt);
    }

    /* Handle mouse movement */
    private _onMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement === this.engine.canvas) {
            this.mouseX = e.movementX;
            this.mouseY = e.movementY;
        }
    };

    /* Handle mouse wheel */
    private _onWheel = (e: WheelEvent) => {
        // Check if zoom is enabled
        if (!this.zoom.enableZoom) return;

        // Prevent default behavior
        e.preventDefault();

        // Calculate new orbit distance
        this.orbit.orbitDistance += e.deltaY * this.zoom.zoomSpeed * 0.01;
        this.orbit.orbitDistance = Math.max(
            this.zoom.minDistance,
            Math.min(this.zoom.maxDistance, this.orbit.orbitDistance)
        );
    };

    /* Start aiming (Gets called from "player-weapon-manager") */
    startAim() {
        // Set aiming flag
        this.isAiming = true;

        // Set aiming flag in movement component
        // this.player?.getComponent(TpsMovement)?.setAiming(true);

        // Show crosshair
        if (this.crosshair) {
            this.crosshair.style.display = 'block';
        }
    }

    /* End aiming (Gets called from "player-weapon-manager") */
    endAim() {
        // Set aiming flag
        this.isAiming = false;

        // Set aiming flag in movement component
        // this.player?.getComponent(TpsMovement)?.setAiming(false);

        // Hide crosshair
        if (this.crosshair) {
            this.crosshair.style.display = 'none';
        }

        /* Reset spine rotation back to neutral */
        if (this.playerSpine) {
            this.playerSpine.setRotationLocal([0, 0, 0, 1]);
        }
    }

    /* Set firing (Gets set from "player-weapon-manager") */
    setFiring(isFiring: boolean) {
        // Set firing flag
        this.isFiring = isFiring;

        // Reset spine rotation back to neutral
        if (!isFiring) {
            if (this.playerSpine) {
                this.playerSpine.setRotationLocal([0, 0, 0, 1]);
            }
        }
    }

    /* Apply aim by zooming and handling player's rotations */
    private applyAim(dt: number) {
        if (!this.aim.enableAim) return;

        // 🧭 Rotate the player to face the camera direction while aiming
        if (this.isAiming || this.isFiring) {
            this.rotatePlayerToCamera();
        }

        // Tilt the spine upward/downward based on camera pitch
        if (this.isAiming || this.isFiring) {
            this.tiltSpine();
        }

        // Save the original orbit distance once, to be able to reset to when not aiming
        if (this.defaultOrbitDistance === undefined) {
            this.defaultOrbitDistance = this.orbit.orbitDistance;
        }

        // Zoom in/out
        const targetZoom = this.isAiming
            ? this.aim.aimZoomDistance
            : this.defaultOrbitDistance;
        this.orbit.orbitDistance +=
            (targetZoom - this.orbit.orbitDistance) * 0.1 * this.aim.aimZoomSpeed * dt;
    }

    /* Rotate the player to the camera direction */
    private rotatePlayerToCamera() {
        // Calculate the direction from the camera to the player
        const playerForward = vec3.create(); // Create a new vector
        vec3.sub(playerForward, this.targetPos, this.tempVec); // direction from camera to player
        playerForward[1] = 0; // Keep rotation horizontal only
        vec3.normalize(playerForward, playerForward); // Normalize the vector

        // Calculate the yaw angle from the forward vector
        let yawAngle = Math.atan2(playerForward[0], playerForward[2]);

        // Slightly rotate the player a bit more to the right
        yawAngle += this.aim.aimRotateOffset * (Math.PI / 180); // convert degrees to radians

        // Apply rotation to player object
        this.playerArmature.setRotationWorld([
            0,
            Math.sin(yawAngle * 0.5),
            0,
            Math.cos(yawAngle * 0.5),
        ]);
    }

    /*
     * Tilt the spine upward/downward based on camera pitch.
     * Preferred to use empty spine parent as the aim offset, (Don't rotate the spine directly — animations will reset it)
     * As this helps bullets spawn higher/lower when aiming up/down,
     * instead of always shooting from the center height.
     */
    private tiltSpine() {
        // Ensure player spine is set
        if (this.playerSpine == null) {
            console.log('❓ [ThirdpersonCamera] Player spine not set! Cannot tilt spine.');
            return;
        }

        // Convert pitch to quaternion rotation around X axis
        const halfAngle = this.pitch * 0.5;
        const sin = Math.sin(halfAngle);
        const cos = Math.cos(halfAngle);

        // Rotate around X (pitch up/down)
        this.playerSpine.setRotationLocal([sin, 0, 0, cos]);
    }

    /* Create crosshair in the middle of the screen */
    private _createCrosshair() {
        /* Create crosshair in the middle of the screen */
        const size = this.crosshairConfig.crosshairSize;
        this.crosshair = document.createElement('img');
        this.crosshair.src = this.crosshairConfig.crosshairDefault;
        this.crosshair.id = 'crosshair';

        // Set the crosshair style
        Object.assign(this.crosshair.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${size}px`, // Width size
            height: `${size}px`, // Height size
            zIndex: '9999',
            pointerEvents: 'none',
            display: 'none', // hidden by default, shown on aim
        });

        document.body.appendChild(this.crosshair);
    }

    /* Call this to animate crosshair recoil on fire */
    animateCrosshairRecoil() {
        if (!this.crosshair) return;

        // Add slight scale per shot
        this.crosshairScale += this.crosshairGrowAmount;
        if (this.crosshairScale > this.crosshairMaxScale) {
            this.crosshairScale = this.crosshairMaxScale;
        }

        // No transition here to make it snappy
        this.crosshair.style.transform = `translate(-50%, -50%) scale(${this.crosshairScale})`;
    }

    /* Smoothly shrink crosshair scale back to default */
    private shrinkCrosshairScale(dt: number) {
        if (!this.crosshair || this.crosshairScale <= 1) return;

        // Decrement scale
        this.crosshairScale -= dt * this.crosshairDecaySpeed;
        if (this.crosshairScale < 1) this.crosshairScale = 1;

        // Apply scale
        this.crosshair.style.transform = `translate(-50%, -50%) scale(${this.crosshairScale})`;
    }

    /* Call this to apply a camera shake on fire */
    cameraShakeRecoil(verticalIntensity = 0.5, horizontalIntensity = 1.0) {
        // How much to kick camera upward
        const recoilAmount = verticalIntensity * (Math.PI / 180);
        this.pitch -= recoilAmount;

        // Clamp pitch after applying recoil
        const maxPitch = (this.pitchClamp.maxPitchAngle * Math.PI) / 180;
        const minPitch = (-this.pitchClamp.minPitchAngle * Math.PI) / 180;
        this.pitch = Math.max(minPitch, Math.min(maxPitch, this.pitch));

        // Add slight horizontal yaw (left/right shake) for a bit of chaos
        const shake = (Math.random() - 0.5) * horizontalIntensity * (Math.PI / 180); // convert to radians
        this.yaw += shake;
    }
}
