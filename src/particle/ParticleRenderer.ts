import { Particle } from "./Particle";

export interface ParticleRenderer {
    render(particles: Particle[]): void
}