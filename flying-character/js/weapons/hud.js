import {Component, Property} from '@wonderlandengine/api';

/**
 * hud
 */
export class Hud extends Component {
    static TypeName = 'hud';
    /* Properties that are configurable in the editor */
    static Properties = {
        imageLocation: Property.string('./images/rifle-silhouette.png'), // Path to the weapon image in your static folder
        weaponImageSize: Property.float(150), // Size of the weapon image
        hudVerticalPosition: Property.float(25), // Vertical position of the HUD
        hudHorizontalPosition: Property.float(50), // Horizontal position of the HUD
        containerWidthPadding: Property.float(35), // Horizontal padding of the HUD container
        containerHeightPadding: Property.float(15), // Vertical padding of the HUD container
        imageTextGap: Property.float(5) // Gap between the image and the bullet/magazine numbers
    };

    /**
     * Called when the component is initialized.
     * Creates the HUD elements and adds them to the document body.
     */
    start() {
        /* Create HUD elements */
        const hudContainer = document.createElement('div');
        hudContainer.id = 'hud-container';

        /* Create weapon silhouette container */
        const weaponContainer = document.createElement('div');
        weaponContainer.id = 'weapon-container';

        /* Create ammo display container */
        const ammoContainer = document.createElement('div');
        ammoContainer.id = 'ammo-container';

        /* Create weapon silhouette */
        const weaponSilhouette = document.createElement('img');
        weaponSilhouette.id = 'weapon-silhouette';
        weaponSilhouette.src = this.imageLocation; // Set image source from parameter
        weaponSilhouette.alt = 'Weapon Silhouette'; // Alt text for image

        /* Create ammo counter */
        const ammoCounter = document.createElement('div');
        ammoCounter.id = 'ammo-counter';
        ammoCounter.innerHTML = '<span id="current-ammo">30</span> / <span id="magazines">2</span>'; // Initial ammo display

        /* Assemble the HUD */
        weaponContainer.appendChild(weaponSilhouette); // Add weapon image to container
        ammoContainer.appendChild(ammoCounter); // Add ammo counter to container
        hudContainer.appendChild(weaponContainer); // Add weapon container to HUD
        hudContainer.appendChild(ammoContainer); // Add ammo container to HUD
        document.body.appendChild(hudContainer); // Add HUD to document body

        /* Add CSS styles */
        const style = document.createElement('style');
        style.innerHTML = `
            #hud-container {
                position: absolute;
                bottom: ${this.hudVerticalPosition}px;
                right: ${this.hudHorizontalPosition}px;
                background-color: rgba(0, 0, 0, 0.7);
                padding: ${this.containerHeightPadding}px ${this.containerWidthPadding}px;
                border-radius: 10px;
                color: white;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.3);
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            #weapon-container {
                margin-bottom: ${this.imageTextGap}px; // Space between image and text
                text-align: center;
            }
            #weapon-silhouette {
                width: ${this.weaponImageSize}px;
                height: auto;
                filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.7));
            }
            #ammo-container {
                width: 100%;
                text-align: center;
            }
            #ammo-counter {
                font-size: 24px;
                font-weight: bold;
                text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
                letter-spacing: 1px;
            }
            #current-ammo {
                color: #ffffff;
            }
            #magazines {
                color: #aaaaaa;
            }
        `;
        document.head.appendChild(style); // Add styles to document
    }

    /**
     * Called every frame.
     * Update HUD logic here, e.g., based on weapon state.
     * @param {number} dt - Delta time.
     */
    update(dt) {
        /* Called every frame. */
        // Update HUD logic here, e.g., based on weapon state
    }

    /**
     * Updates the HUD with the current ammo and magazines.
     * @param {number} bullets - Current ammo.
     * @param {number} magazines - Current magazines.
     */
    updateHUD(bullets, magazines) {
        const currentAmmoElement = document.getElementById('current-ammo');
        const magazinesElement = document.getElementById('magazines');
        
        if (currentAmmoElement) {
            currentAmmoElement.innerText = bullets;
        }
        if (magazinesElement) {
            magazinesElement.innerText = magazines;
        }
    }
}
