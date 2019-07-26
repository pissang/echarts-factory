import { Camera, Euler, FaceNormalsHelper, Vector3, Matrix3 } from "three";

const KEY_UP = 38;
const KEY_W = 87;
const KEY_LEFT = 37;
const KEY_A = 65;
const KEY_RIGHT = 39;
const KEY_D = 68;
const KEY_DOWN = 40;
const KEY_S = 83;

export class KeyboardControl {
    camera: Camera

    domElement: HTMLElement

    speedZ = 2
    speedX = 1

    private euler = new Euler(0, 0, 0, 'YXZ')

    enabled = false

    private isLocked = false

    private moveForward = false;
    private moveLeft = false;
    private moveBackward = false;
    private moveRight = false;

    private direction = new Vector3()

    constructor(camera: Camera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;

        domElement.addEventListener('click', this.lock.bind(this));
        domElement.addEventListener('mousemove', this.onMouseMove.bind(this));

        document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));

        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    enable() {
        this.enabled = true;
    }
    disable() {
        this.enabled = false;
        this.unlock();
    }

    onMouseMove(event) {
        if (!this.isLocked || !this.enabled) {
            return;
        }

		let movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        let movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        movementX = Math.min(Math.max(movementX, -10), 10);
        movementY = Math.min(Math.max(movementY, -10), 10);

        let euler = this.euler;

		euler.setFromQuaternion(this.camera.quaternion);

		euler.y -= movementX * 0.008;
		euler.x -= movementY * 0.008;

        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

		this.camera.quaternion.setFromEuler(euler);

    }

    onKeyDown(event: KeyboardEvent) {
        if (!this.enabled) {
            return;
        }
        switch(event.keyCode) {
            case KEY_UP:
            case KEY_W:
                this.moveForward = true;
                break;
            case KEY_DOWN:
            case KEY_S:
                this.moveBackward = true;
                break;
            case KEY_LEFT:
            case KEY_A:
                this.moveLeft = true;
                break;
            case KEY_RIGHT:
            case KEY_D:
                this.moveRight = true;
                break;
        }
    }

    onKeyUp(event: KeyboardEvent) {
        switch(event.keyCode) {
            case KEY_UP:
            case KEY_W:
                this.moveForward = false;
                break;
            case KEY_DOWN:
            case KEY_S:
                this.moveBackward = false;
                break;
            case KEY_LEFT:
            case KEY_A:
                this.moveLeft = false;
                break;
            case KEY_RIGHT:
            case KEY_D:
                this.moveRight = false;
                break;
        }
    }

    onPointerLockChange() {
        if (document.pointerLockElement === this.domElement) {
            this.isLocked = true;
        }
        else {
            this.isLocked = false;
        }
    }

    lock() {
        if (this.enabled) {
            this.domElement.requestPointerLock();
        }
    }

    unlock() {
        document.exitPointerLock();
    }

    update(dTime) {
        dTime /= 1000;
        let dir = this.direction;
        dir.set(0, 0, 0);
        if (this.moveForward) {
            dir.z -= this.speedZ * dTime;
        }
        if (this.moveBackward) {
            dir.z += this.speedZ * dTime;
        }
        if (this.moveLeft) {
            dir.x -= this.speedX * dTime;
        }
        if (this.moveRight) {
            dir.x += this.speedX * dTime;
        }

        dir.applyQuaternion(this.camera.quaternion);

        // dir.y = 0;
        this.camera.position.add(dir);
    }
}