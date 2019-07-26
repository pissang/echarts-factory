import { Emitter } from "./Emitter";
import { Behavior } from "./Behavior";
import { ParticleRenderer } from "./ParticleRenderer";
import { Particle } from "./Particle";

export class ParticleSystem {
    private emitters: Emitter[] = [];

    private particles: Particle[] = [];
    private particlePool: Particle[] = [];

    private behaviors: Behavior[] = []


    renderer: ParticleRenderer;

    addEmitter(emitter: Emitter) {
        this.emitters.push(emitter);
    }

    addBehavior(behavior: Behavior) {
        // Add behavior to all emitters
        this.behaviors.push(behavior);
    }

    update(dTime) {
        dTime /= 1000;

        let particles = this.particles;
        let particlesPool = this.particlePool;
        for (let i = 0; i < this.emitters.length; i++) {
            this.emitters[i].update(dTime, particles, particlesPool);
        }

        let len = particles.length;
        for (let i = 0; i < len;) {
            let particle = particles[i];

            for (let k = 0; k < this.behaviors.length; k++) {
                this.behaviors[k].apply(particle, dTime);
            }

            particle.age += dTime;

            if (particle.age >= particle.life) {
                // Kill particle and put it into the pool
                particlesPool.push(particle);
                particles[i] = particles[len - 1];
                particles.pop();
                len--;
            }
            else {
                i++;
            }
        }

        if (this.renderer) {
            this.renderer.render(particles)
        }
    }
}