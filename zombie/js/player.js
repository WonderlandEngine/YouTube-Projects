import {Component, Property} from '@wonderlandengine/api';

/**
 * player
 */
export class Player extends Component {
    static TypeName = 'player';
    /* Properties that are configurable in the editor */
    static Properties = {
        damageSphere: Property.object(),
        camera: Property.object(), // Camera object (usually NonVRCamera)
    };

    start() {
        this.health = 100;
        this.damageSphere.active = false;
        this.shakeTime = 0;
        this.shakeActive = false;
        
        /* Create health bar */
        this.createHealthBar();
        this.updateHealthBar();
    }

    update(dt) {
        /* Update camera shake */
        this.updateCameraShake(dt);
    }

    /* Start camera shake effect */
    startCameraShake(duration) {
        this.shakeTime = duration;
        this.shakeActive = true;
    }

    /* Update camera shake each frame */
    updateCameraShake(dt) {
        if (!this.shakeActive) return;

        /* Decrease shake time */
        this.shakeTime -= dt;
        if (this.shakeTime <= 0) {
            this.shakeActive = false;
            return;
        }

        /* Apply random shake to camera */
        const cam = this.camera?.getComponent('thirdperson-camera');
        if (cam) {
            const intensity = 0.1;
            cam.yaw += (Math.random() - 0.5) * intensity;
            cam.pitch += (Math.random() - 0.5) * intensity;
        }
    }

    minusHealth() {
        /* Decrease health by 10 */
        this.health -= 10;

        /* Update health bar */
        this.updateHealthBar();

        /* If health is less than or equal to 0, call onDeath */
        if (this.health <= 0) {
            this.onDeath();
        }

        /* Make the damage sphere visible, for 0.1 seconds */
        this.damageSphere.active = true;
        setTimeout(() => {
            this.damageSphere.active = false;
        }, 100);

        /* Start camera shake for 0.2 seconds */
        this.startCameraShake(0.2);
    }

    /* Update health bar based on current health */
    updateHealthBar() {
        const healthBarFill = document.getElementById('health-bar-fill');
        if (healthBarFill) {
            const healthPercent = Math.max(0, Math.min(100, this.health));
            healthBarFill.style.width = healthPercent + '%';
            
            /* Change color based on health */
            if (healthPercent > 60) {
                healthBarFill.style.backgroundColor = '#4CAF50'; // Green
            } else if (healthPercent > 30) {
                healthBarFill.style.backgroundColor = '#FFC107'; // Yellow
            } else {
                healthBarFill.style.backgroundColor = '#F44336'; // Red
            }
        }
    }

    onDeath() {
        /* Create game over screen */
        this.createGameOverScreen();

        /* Make the mouse appear */
        document.exitPointerLock();
    }

    /* ============================================ */
    /*           HTML & CSS Section                 */
    /* ============================================ */

    /* Creates the game over screen, using HTML and CSS */
    createGameOverScreen() {
        /* Check if game over screen already exists */
        if (document.getElementById('game-over-screen')) {
            return;
        }

        /* Create black overlay */
        const overlay = document.createElement('div');
        overlay.id = 'game-over-screen';
        
        /* Create game over text */
        const gameOverText = document.createElement('div');
        gameOverText.id = 'game-over-text';
        gameOverText.textContent = 'Game Over';
        
        /* Create retry button */
        const retryButton = document.createElement('button');
        retryButton.id = 'retry-button';
        retryButton.textContent = 'Retry';
        retryButton.onclick = () => {
            /* Reload page to restart game */
            window.location.reload();
        };
        
        /* Assemble game over screen */
        overlay.appendChild(gameOverText);
        overlay.appendChild(retryButton);
        document.body.appendChild(overlay);
        
        /* Add CSS styles */
        const style = document.createElement('style');
        style.innerHTML = `
            #game-over-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 1);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            #game-over-text {
                color: white;
                font-size: 72px;
                font-weight: bold;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                text-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
                margin-bottom: 40px;
            }
            #retry-button {
                padding: 15px 40px;
                font-size: 24px;
                font-weight: bold;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.3s;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            }
            #retry-button:hover {
                background-color: #45a049;
            }
            #retry-button:active {
                transform: scale(0.95);
            }
        `;
        document.head.appendChild(style);
    }

    /* Create health bar HTML elements */
    createHealthBar() {
        /* Check if health bar already exists */
        if (document.getElementById('health-bar-container')) {
            return;
        }

        /* Create container */
        const container = document.createElement('div');
        container.id = 'health-bar-container';

        /* Create health bar background */
        const healthBarBg = document.createElement('div');
        healthBarBg.id = 'health-bar-bg';

        /* Create health bar fill */
        const healthBarFill = document.createElement('div');
        healthBarFill.id = 'health-bar-fill';

        /* Assemble health bar */
        healthBarBg.appendChild(healthBarFill);
        container.appendChild(healthBarBg);
        document.body.appendChild(container);

        /* Add CSS styles */
        const style = document.createElement('style');
        style.innerHTML = `
            #health-bar-container {
                position: fixed;
                top: 40px;
                left: 40px;
                z-index: 1000;
            }
            #health-bar-bg {
                width: 200px;
                height: 30px;
                background-color: rgba(0, 0, 0, 0.7);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 5px;
                overflow: hidden;
            }
            #health-bar-fill {
                width: 100%;
                height: 100%;
                background-color: #4CAF50;
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }
}
