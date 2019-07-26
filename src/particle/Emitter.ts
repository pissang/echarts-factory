import { Vector3, Quaternion, Vector2, Vector4, Color, Mesh } from "three";
import { Behavior } from "./Behavior";
import { Particle } from "./Particle";


export abstract class InitialValue<T> {

    a: T
    b: T

    constructor(a: T, b?: T) {
        this.a = a;
        if (b == null) {
            b = a;
        }
        this.b = b;
    }

    abstract get(out?: T): T
}

export class InitialNumber extends InitialValue<number> {
    get(): number {
        let a = this.a;
        let b = this.b;
        if (a === b) {
            return a;
        }
        let t = Math.random();
        return (b - a) * t + a;
    }
}


// Vector like
type Vector = {
    copy(Vector): Vector;
    lerpVectors(a: Vector, b: Vector, t: number);
}

export class InitialVector extends InitialValue<Vector> {
    get(out: Vector): Vector {
        let a = this.a;
        let b = this.b;
        if (a === b) {
            out.copy(a);
            return out;
        }
        let t = Math.random();
        out.lerpVectors(a, b, t);
        return out;
    }
}

export class InitialQuaternion extends InitialValue<Quaternion> {
    get(out: Quaternion): Quaternion {
        let a = this.a;
        let b = this.b;
        if (a === b) {
            out.copy(a);
            return out;
        }
        let t = Math.random();
        Quaternion.slerp(a, b, out, t);
        return out;
    }
}

export class InitialColor extends InitialValue<Color> {
    get(out: Color): Color {
        let a = this.a;
        let b = this.b;
        out.copy(a);
        if (b !== a) {
            let t = Math.random();
            out.lerp(b, t);
        }
        return out;
    }
}

export class Emitter {

    life = new InitialNumber(4)

    amount = new InitialNumber(4)

    rate = new InitialNumber(0.1)   // Every 0.1 second

    mass = new InitialNumber(1)

    position = new InitialVector(new Vector3())

    velocity = new InitialVector(new Vector3())

    rotation = new InitialQuaternion(new Quaternion())

    color = new InitialColor(new Color())

    size = new InitialVector(new Vector3(1, 1, 1))

    private timeElapsed = 0
    private currentRate;

    update(dTime, particles: Particle[], particlesPool: Particle[]) {
        if (this.currentRate == null) {
            this.currentRate = this.rate.get();
        }
        if (this.timeElapsed > this.currentRate) {
            this.emit(particles, particlesPool);
            this.currentRate = this.rate.get();
            this.timeElapsed = 0;
        }

        this.timeElapsed += dTime;
    }

    private emit(particles: Particle[], particlesPool: Particle[]) {
        let amount = this.amount.get();
        for (let i = 0; i < amount; i++) {
            let particle = particlesPool.pop();
            if (!particle) {
                particle = new Particle();
            }
            particles.push(particle);
            this.initParticle(particle);
        }
    }

    private initParticle(particle: Particle) {
        particle.age = 0;
        particle.life = this.life.get();

        particle.mass = this.mass.get();

        this.position.get(particle.position);
        this.rotation.get(particle.rotation);
        this.velocity.get(particle.velocty);
        this.size.get(particle.size);
        this.color.get(particle.color);
    }
}