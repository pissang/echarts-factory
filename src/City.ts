/**
 * Fractal city to simulate transport and neural
 *
 * http://williamchyr.com/2015/05/fractal-generating-with-probuilder/
 */

import { Vector3, BoxBufferGeometry, BufferGeometry, Mesh, Group, MeshStandardMaterial, Color, TextureLoader, Texture, NearestFilter } from "three";
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils';

let directions = [
    new Vector3(0, 0, 1),
    new Vector3(0, 0, -1),

    new Vector3(1, 0, 0),
    new Vector3(0, 1, 0),
    new Vector3(0, -1, 0),
    new Vector3(-1, 0, 0)
];

let CELL_EMISSIVE_MAP_SIZE = 64;

class Cell {
    position = new Vector3()
    index = -1
    size = 1

    level = 0

    isActived = false
    intensity = 0

    color = [Math.random(), Math.random(), Math.random()]

    children: Cell[] = []

    constructor(pos?: Vector3) {
        if (pos) {
            this.position.copy(pos);
        }
    }

    u(normalized: boolean): number {
        let u = (this.index % CELL_EMISSIVE_MAP_SIZE);
        if (normalized) {
            u /= CELL_EMISSIVE_MAP_SIZE;
        }
        return u;
    }

    v(normalized: boolean): number {
        let v = Math.floor(this.index / CELL_EMISSIVE_MAP_SIZE);
        if (normalized) {
            v /= CELL_EMISSIVE_MAP_SIZE;
        }
        return v;
    }

    active() {
        this.isActived = true;
        this.intensity += (this.level + 1) / 5;
        this.intensity = Math.min(this.intensity, 1);
    }

    update(dTime) {
        if (!this.isActived) {
            return;
        }

        this.intensity -= 0.01;

        if (this.intensity <= 0) {
            this.intensity = 0;
            this.isActived = false;
        }
    }
}

let tmpV = new Vector3();

class Pack {

    static packsPool: Pack[] = []

    routes: Cell[]

    direction = new Vector3()

    finished = false

    speed = 50

    private index = -1

    private percent = 0

    private step = 0

    mesh: Mesh

    static sendRandom(rootNode: Cell) {

        let routes: Cell[] = [];
        function addStation(node: Cell) {
            routes.push(node);
            let children = node.children;
            let randomChild = children[Math.round(Math.random() * (children.length - 1))];

            if (randomChild) {
                addStation(randomChild);
            }
        }

        addStation(rootNode);

        let pack = this.packsPool.pop();
        if (!pack) {
            pack = new Pack(routes);
        }
        else {
            pack.reset(routes);
        }
        return pack;
    }

    static destroy(pack) {
        this.packsPool.push(pack);
    }

    constructor(routes: Cell[]) {
        this.routes = routes;
    }

    reset(routes) {
        this.routes = routes;
        this.index = -1;
        this.step = 0;
        this.percent = 0;
        this.finished = false;
    }

    onfinish() {}

    update(dTime) {
        let onTurn = false;
        if (this.index < 0 || this.percent >= 1) {
            this.turn();
            if (this.finished) {
                return;
            }
            onTurn = true;
        }
        let endNode = this.routes[this.index + 1];
        let start = this.routes[this.index].position;
        let end = endNode.position;

        if (onTurn) {
            this.percent = 0;
            this.step = 1 / (end.distanceTo(start) / (this.speed / 1000 * 16));

            this.direction.subVectors(end, start).normalize();

            let size = Math.min(endNode.size / 3, 0.5);
            let scale = 3;
            this.mesh.scale.set(
                Math.max(Math.abs(this.direction.x * scale), size),
                Math.max(Math.abs(this.direction.y * scale), size),
                Math.max(Math.abs(this.direction.z * scale), size)
            );
        }

        this.percent += this.step;

        this.mesh.position.lerpVectors(start, end, this.percent);
    }

    private turn() {
        this.index++;
        this.routes[this.index].active();
        if (this.index >= this.routes.length - 1) {
            this.finished = true;
            return false;
        }
    }
}

export class City {

    initialDistance = 40
    initialSize = 4

    distanceRandom = 0.4
    sizeRandom = 0.2
    childRandom = [1, 0.8, 0.7, 0.6, 0.2]

    maxLevel = 5

    private rootNodes: Cell[] = []
    private cells: Cell[] = []

    private nodesGeometries: BufferGeometry[] = []
    private tubeGeometries: BufferGeometry[] = []

    private sendGap = 50
    private packs: Pack[] = []
    private currentSend = 0

    private elapsedTime = 0

    private packGeometry = new BoxBufferGeometry()
    private packMaterial = new MeshStandardMaterial({
        emissiveIntensity: 20,
        emissive: new Color(0.0, 0.189, 0.775)
    })

    private cellMaterial = new MeshStandardMaterial({
        color: new Color(1, 1, 1),
        emissiveIntensity: 30,
        emissive: new Color(1, 1, 1)
    })
    private cellEmissiveMap: Texture
    private cellEmissiveCtx: CanvasRenderingContext2D
    private cellEmissivePixels: ImageData

    group: Group = new Group()

    constructor() {
        this.initTree();

        let mesh = new Mesh(BufferGeometryUtils.mergeBufferGeometries(this.nodesGeometries), this.cellMaterial);
        let tubeMesh = new Mesh(
            BufferGeometryUtils.mergeBufferGeometries(this.tubeGeometries),
            new MeshStandardMaterial({
                opacity: 0.6,
                transparent: true,
                depthWrite: false,
                depthTest: true
            })
        );
        this.group.add(mesh);
        this.group.add(tubeMesh);

        this.nodesGeometries = [];
        this.tubeGeometries = [];

        let emissiveCanvas = document.createElement('canvas');
        this.cellEmissiveCtx = emissiveCanvas.getContext('2d');
        emissiveCanvas.width = emissiveCanvas.height = CELL_EMISSIVE_MAP_SIZE;
        this.cellEmissiveMap = new Texture(emissiveCanvas);
        this.cellEmissiveMap.minFilter = this.cellEmissiveMap.magFilter = NearestFilter;
        this.cellEmissiveMap.flipY = false;
        this.cellEmissiveMap.premultiplyAlpha = false;
        this.cellEmissiveMap.needsUpdate = true;
        this.cellMaterial.emissiveMap = this.cellEmissiveMap;
        this.cellMaterial.needsUpdate = true;
    }

    private initTree() {
        let rootNode1 = new Cell(new Vector3(-5, 0, 0));
        let rootNode2 = new Cell(new Vector3(5, 0, 0));
        let rootNode3 = new Cell(new Vector3(0, 0, 0));
        let rootNode4 = new Cell(new Vector3(0, 0, 0));
        let node1 = new Cell(new Vector3(-5, 0, this.initialDistance));
        let node2 = new Cell(new Vector3(5, 0, -this.initialDistance));
        let node3 = new Cell(new Vector3(this.initialDistance + 40, 0, 0));
        let node4= new Cell(new Vector3(-this.initialDistance - 40, 0, 0));

        rootNode1.children.push(node1);
        rootNode2.children.push(node2);
        rootNode3.children.push(node3);
        rootNode4.children.push(node4);

        node1.size = node2.size = node3.size = node4.size = this.initialSize;

        this.generateTree(node1, new Vector3(0, 0, -1), this.initialDistance, 0);
        this.generateTree(node2, new Vector3(0, 0, 1), this.initialDistance, 0);
        this.generateTree(node3, new Vector3(-1, 0, 0), this.initialDistance, 0);
        this.generateTree(node4, new Vector3(1, 0, 0), this.initialDistance, 0);

        this.rootNodes.push(rootNode1);
        this.rootNodes.push(rootNode2);
        this.rootNodes.push(rootNode3);
        this.rootNodes.push(rootNode4);
    }

    private createNodeGeometry(node: Cell) {
        let index = this.nodesGeometries.length;
        node.index = index;

        let geometry = new BoxBufferGeometry(node.size, node.size, node.size, 1, 1, 1);
        geometry.translate(node.position.x, node.position.y, node.position.z);
        // Modify uv
        let v = node.v(true);
        let u = node.u(true);

        let uv = geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
            uv.setXY(i, u, v);
        }

        this.nodesGeometries.push(geometry);
    }

    private createTubeGeometry(childNode: Cell, sourceDir: Vector3, sourceDist: number) {
        let pos1 = childNode.position;
        let size = Math.min(childNode.size / 2, 0.8);
        let scaleX = Math.max(Math.abs(sourceDir.x * sourceDist), size);
        let scaleY = Math.max(Math.abs(sourceDir.y * sourceDist), size);
        let scaleZ = Math.max(Math.abs(sourceDir.z * sourceDist), size);
        let geometry = new BoxBufferGeometry(scaleX, scaleY, scaleZ, 1, 1, 1);
        geometry.translate(
            pos1.x + sourceDir.x * sourceDist / 2,
            pos1.y + sourceDir.y * sourceDist / 2,
            pos1.z + sourceDir.z * sourceDist / 2
        );
        this.tubeGeometries.push(geometry);
    }

    private generateTree(currentNode: Cell, sourceDir: Vector3, sourceDist: number, level: number): Cell {
        this.createNodeGeometry(currentNode);
        this.createTubeGeometry(currentNode, sourceDir, sourceDist);

        currentNode.level = level;

        this.cells.push(currentNode);

        if (level > this.maxLevel) {
            return;
        }

        let currentSize = currentNode.size;
        let childRandom = this.childRandom[Math.min(level, this.childRandom.length - 1)];
        for (let i = 0; i < 6; i++) {
            let dir = directions[i];
            if (dir.equals(sourceDir)) {
                continue;
            }

            if (Math.random() > childRandom) {
                continue;
            }

            let childDist = sourceDist / (level === 0 ? 1 : 2) * (1 + Math.random() * this.distanceRandom);
            tmpV.copy(currentNode.position).addScaledVector(dir, childDist);
            // Not in the building region
            if (Math.abs(tmpV.x) < 100 && (tmpV.y < 60 && tmpV.y > -5) && Math.abs(tmpV.z) < 15) {
                continue;
            }

            let childNode = new Cell();
            childNode.size = currentSize / (level === 0 ? 1 : 1.5);
            childNode.position.copy(tmpV);
            currentNode.children.push(childNode);

            this.generateTree(childNode, dir.clone().negate(), childDist, level + 1);
        }

        return currentNode;
    }


    update(dTime) {
        this.elapsedTime += dTime;
        this.updatePacks(dTime);
        this.updateCells(dTime);
    }

    private updatePacks(dTime: number) {
        if (this.elapsedTime > this.sendGap) {
            for (let i = 0; i < 1; i ++) {
                let pack = Pack.sendRandom(this.rootNodes[this.currentSend]);
                if (!pack.mesh) {
                    pack.mesh = new Mesh(this.packGeometry, this.packMaterial);
                    this.group.add(pack.mesh);
                }
                pack.mesh.visible = true;

                this.currentSend = (this.currentSend + 1) % this.rootNodes.length;
                this.elapsedTime = 0;

                this.packs.push(pack);
            }
        }

        let len = this.packs.length;
        for (let i = 0; i < len;) {
            let pack = this.packs[i];
            pack.update(dTime);

            // Remove dead
            if (pack.finished) {
                Pack.destroy(pack);
                pack.mesh.visible = false;

                let last = this.packs[len - 1];
                this.packs[i] = last;
                this.packs.pop();

                len--;
            }
            else {
                i++;
            }
        }
    }

    private updateCells(dTime: number) {
        let ctx = this.cellEmissiveCtx;
        if (!this.cellEmissivePixels) {
            this.cellEmissivePixels = ctx.createImageData(CELL_EMISSIVE_MAP_SIZE, CELL_EMISSIVE_MAP_SIZE);
        }
        let pixels = this.cellEmissivePixels.data;
        for (let i = 0; i < this.cells.length; i++) {
            let cell = this.cells[i];
            cell.update(dTime);

            let u = cell.u(false);
            let v = cell.v(false);
            let index4 = (v * CELL_EMISSIVE_MAP_SIZE + u) * 4;
            if (cell.isActived) {
                pixels[index4] = 0.0 * 255 * cell.intensity;
                pixels[index4 + 1] = 0.189 * 255 * cell.intensity;
                pixels[index4 + 2] = 0.775 * 255 * cell.intensity;
                // pixels[index4] = cell.color[0] * 255 * cell.intensity;
                // pixels[index4 + 1] = cell.color[1] * 255 * cell.intensity;
                // pixels[index4 + 2] = cell.color[2] * 255 * cell.intensity;
                pixels[index4 + 3] = 255;
            }
            else {
                pixels[index4] = 0;
                pixels[index4 + 1] = 0;
                pixels[index4 + 2] = 0;
            }
        }
        ctx.putImageData(this.cellEmissivePixels, 0, 0);
        this.cellEmissiveMap.needsUpdate = true;
    }
}