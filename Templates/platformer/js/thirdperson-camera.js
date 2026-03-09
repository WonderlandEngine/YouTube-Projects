import {Component, Property} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';
import {TpsMovement} from './tps-movement';

/* Records */
class OrbitSettings {
    static Properties = {
        orbitDistance: Property.float(5), // Default camera distance from player
        verticalOffset: Property.float(1.5), // How high above the player to look
        horizontalOffset: Property.float(0.5), // How far to the side of the player
    };
}
class SensitivitySettings {
    static Properties = {
        rotationSpeed: Property.float(0.3), // Speed of camera rotation
        verticalSensitivity: Property.float(0.3), // Pitch speed
        horizontalSensitivity: Property.float(0.8), // Yaw speed
    };
}
class ZoomSettings {
    static Properties = {
        enableZoom: Property.bool(false), // Enable/disable zoom with scroll (⚠️Doesn't work with "enableAim")
        zoomSpeed: Property.float(0.2), // How fast zoom changes with scroll
        minDistance: Property.float(2), // Minimum zoom distance
        maxDistance: Property.float(10), // Maximum zoom distance
    };
}
class PitchClampSettings {
    static Properties = {
        minPitchAngle: Property.float(30), // degrees (downward limit)
        maxPitchAngle: Property.float(75), // degrees (upward limit)
    };
}
class AimSettings {
    static Properties = {
        enableAim: Property.bool(true), // Enable/disable right-click aim mode
        aimZoomDistance: Property.float(2.0), // Camera zoom distance when aiming
        aimZoomSpeed: Property.float(100), // How fast zoom changes when aiming
        aimRotateOffset: Property.float(-15.0), // How much degrees to rotate player to the right when aiming
    };
}
class CrosshairSettings {
    static Properties = {
        crosshairDefault: Property.string('./images/crosshair-default.png'), // Set this to your crosshair static image path (ex: './images/crosshair.png')
        crosshairSize: Property.float(32.0), // 📏 Default width/height in pixels
        crosshairMaxScale: Property.float(2.0), // 🔼 Max size it can grow
        crosshairGrowAmount: Property.float(0.15), // ➕ How much it grows per shot
        crosshairDecaySpeed: Property.float(1.5), // 🔻 How fast it shrinks back
    };
}

/**
 * thirdperson-camera
 * Handles the camera movement and aiming.
 */
export class ThirdpersonCamera extends Component {
    static TypeName = 'thirdperson-camera';

    static Properties = {
        // Player object to look at
        player: Property.object(), // The parent player
        playerArmature: Property.object(), // The object to orbit around (usually the player's armature)
        playerSpine: Property.object(), // The spine bone of the player, used for vertical aiming (Prefere empty spine parent "spineAimOffset")

        // Orbit
        orbit: Property.record(OrbitSettings),

        // Sensitivity
        sensitivity: Property.record(SensitivitySettings),

        // Zoom
        zoom: Property.record(ZoomSettings),

        // Clamp pitch
        pitchClamp: Property.record(PitchClampSettings),

        // Aim
        aim: Property.record(AimSettings),

        // Crosshair
        crosshairConfig: Property.record(CrosshairSettings),
    };

    /* Gets called on game start */
    start() {
        // Initial values
        this.yaw = 0;
        this.pitch = (15 * Math.PI) / 180;

        // Mouse movement
        this.mouseX = 0;
        this.mouseY = 0;

        // Vectors, used for calculations
        this.tempVec = vec3.create();
        this.targetPos = vec3.create();

        // Flags
        this.isAiming = false;
        this.isFiring = false;

        // Crosshair
        this.crosshairScale = 1;
        this.crosshairMaxScale = this.crosshairConfig.crosshairMaxScale; // 🔼 Max size it can grow
        this.crosshairDecaySpeed = this.crosshairConfig.crosshairDecaySpeed; // 🔻 How fast it shrinks back
        this.crosshairGrowAmount = this.crosshairConfig.crosshairGrowAmount; // 🔼 How much it grows per shot

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
    update(dt) {
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
    _onMouseMove = (e) => {
        if (document.pointerLockElement === this.engine.canvas) {
            this.mouseX = e.movementX;
            this.mouseY = e.movementY;
        }
    };

    /* Handle mouse wheel */
    _onWheel = (e) => {
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
        this.player?.getComponent(TpsMovement)?.setAiming(true);

        // Show crosshair
        this.crosshair.style.display = 'block';
    }

    /* End aiming (Gets called from "player-weapon-manager") */
    endAim() {
        // Set aiming flag
        this.isAiming = false;

        // Set aiming flag in movement component
        this.player?.getComponent(TpsMovement)?.setAiming(false);

        // Hide crosshair
        this.crosshair.style.display = 'none';

        /* Reset spine rotation back to neutral */
        if (this.playerSpine) {
            this.playerSpine.setRotationLocal([0, 0, 0, 1]);
        }
    }

    /* Set firing (Gets set from "player-weapon-manager") */
    setFiring(isFiring) {
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
    applyAim(dt) {
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
    rotatePlayerToCamera() {
        // Calculate the direction from the camera to the player
        const playerForward = vec3.create(); // Create a new vector
        vec3.sub(playerForward, this.targetPos, this.tempVec); // direction from camera to player
        playerForward[1] = 0; // Keep rotation horizontal only
        vec3.normalize(playerForward, playerForward); // Normalize the vector

        // Calculate the yaw angle from the forward vector
        var yawAngle = Math.atan2(playerForward[0], playerForward[2]);

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
    tiltSpine() {
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
    _createCrosshair() {
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
            height: `${size}px`, // Heiht size
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
    shrinkCrosshairScale(dt) {
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
