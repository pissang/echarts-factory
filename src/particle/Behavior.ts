import { Particle } from "./Particle";
import { Vector3 } from "three";

export interface Behavior {
    apply(particle: Particle, dt: number);
}

export class ForceBehavior implements Behavior {

    force: Vector3;

    constructor(force: Vector3) {
        this.force = force;
    }

    apply(particle: Particle, dt: number) {
        particle.velocty.addScaledVector(this.force, dt / particle.mass)
    }
}

export class ApplyVelocityBehavior implements Behavior {
    apply(particle: Particle, dt: number) {
        particle.position.addScaledVector(particle.velocty, dt);
    }
}
