import { Color, Vector3, Quaternion, Mesh } from "three";

export class Particle {
    age = 0
    life = 1
    color = new Color(0xffffff)
    position = new Vector3()
    velocty = new Vector3()
    rotation = new Quaternion()
    size = new Vector3(1, 1, 1);
    opacity = 1;
    mass = 1;
}