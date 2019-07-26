import { ParticleRenderer } from "./ParticleRenderer";
import { Particle } from "./Particle";
import { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";

export class ParticleMeshRenderer implements ParticleRenderer {

    group: Group;

    // Mesh pool
    private meshes: Mesh[] = [];

    particleMesh: Mesh;

    constructor(particleMesh) {
        this.group = new Group();
        this.particleMesh = particleMesh;
    }

    render(particles: Particle[]) {
        let meshes = this.meshes;
        let i;
        for (i = 0; i < particles.length; i++) {
            let particle = particles[i];
            let mesh = meshes[i];
            if (!mesh) {
                mesh = this.particleMesh.clone();
                this.group.add(mesh);
                meshes[i] = mesh;
            }
            mesh.visible = true;

            mesh.position.copy(particle.position);
            mesh.quaternion.copy(particle.rotation);
            mesh.scale.copy(particle.size);

            let mat = mesh.material as MeshStandardMaterial;
            if (mat.color) {
                mat.color.copy(particle.color);
                mat.opacity = particle.opacity;
            }
        }

        for (; i < meshes.length; i++) {
            meshes[i].visible = false;
        }
    }
}