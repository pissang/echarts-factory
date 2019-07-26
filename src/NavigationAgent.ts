import { Geometry, Vector3, Camera, Mesh, Raycaster } from "three";
import {Pathfinding} from 'three-pathfinding/src/index';

let ZONE_ID = 'main';
// Character navigator
export class NavigationAgent {

    private camera: Camera

    private navmesh: Mesh

    private pathfinding =  new Pathfinding()

    private prevPosition = new Vector3()

    private position = new Vector3()

    private clampedPosition = new Vector3()

    private raycaster = new Raycaster()
    // TODO
    // 底座高度为 1.0，相机高度为 1.7
    height = 0.7

    private currentNode;

    constructor(camera: Camera, navmesh: Mesh) {
        this.camera = camera;
        this.navmesh = navmesh;
        this.pathfinding.setZoneData(ZONE_ID, Pathfinding.createZone(navmesh.geometry));
    }

    update() {
        let position = this.position;
        position.copy(this.camera.position);

        position.y -= this.height;
        // TODO
        // this.raycaster.ray.origin.copy(position);
        // this.raycaster.ray.origin.y += 0.1
        // this.raycaster.ray.direction.set(0, -1, 0);
        // let intersection = this.raycaster.intersectObject(this.navmesh);
        // if (intersection[0]) {
        //     position.copy(intersection[0].point);
        // }


        let groupId = this.pathfinding.getGroup(ZONE_ID, position);
        if (!this.currentNode) {
            if (!(this.currentNode = this.pathfinding.getClosestNode(position, ZONE_ID, groupId, false))) {
                return
            }
        }

        this.currentNode = this.pathfinding.clampStep(this.prevPosition, position, this.currentNode, ZONE_ID, groupId, this.clampedPosition);

        this.camera.position.copy(this.clampedPosition);
        this.prevPosition.copy(this.clampedPosition);
        this.camera.position.y += this.height;
    }
}