// For path finding extensions
import * as THREE from 'three';
(window as any).THREE = THREE;

import {WebGLRenderer, PerspectiveCamera, Scene, Box3, Vector3, DirectionalLight, HemisphereLight, TextureLoader, Mesh, MeshStandardMaterial, LinearFilter, BufferGeometry, BufferAttribute, RepeatWrapping, InstancedInterleavedBuffer, Texture, CubeTextureLoader, Vector2, NearestFilter, HalfFloatType, FogExp2, AnimationMixer, AnimationActionLoopStyles, LoopOnce, Group, Int8Attribute, Object3D, VideoTexture, BoxBufferGeometry, MeshBasicMaterial, Color, CubeCamera, GeometryUtils} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {EffectComposer} from'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from'three/examples/jsm/postprocessing/RenderPass';
import {UnrealBloomPass} from'three/examples/jsm/postprocessing/UnrealBloomPass';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader';
import tonemappingShader from './tonemappingShader';
import {KeyboardControl} from './KeyboardControl';
import {FrostedGlassPass} from './FrostedGlassPass';
import {loadMainScene} from './scene';
import { NavigationAgent } from './NavigationAgent';
import { City } from './City';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils';


let canvas = document.querySelector('canvas');
let renderer = new WebGLRenderer({
    canvas,
    // antialias: true,
    logarithmicDepthBuffer: true
});
renderer.gammaInput = true;

let camera = new PerspectiveCamera();
camera.position.set(-13.652, 1.7, 50);
camera.aspect = canvas.width / canvas.height;
camera.far = 2000;
camera.updateProjectionMatrix();
let scene = new Scene();
let glassScene = new Scene();
// let mainLight = new DirectionalLight(0xffffff, 0.4);
// mainLight.position.set(10, 30, 10);

let ambientLight = new HemisphereLight();
ambientLight.intensity = 0.3;
// scene.add(mainLight);
scene.fog = new FogExp2(0x000000, 0.01);
scene.add(ambientLight);

let composer = new EffectComposer(renderer);
let renderPass = new RenderPass(scene, camera);
let glassPass = new FrostedGlassPass(renderer, renderPass, glassScene);
let bloomPass = new UnrealBloomPass(
    new Vector2(canvas.width, canvas.height), 0.3, 0.5, 1
);
let tonemappingPass = new ShaderPass(tonemappingShader);
let fxaaPass = new ShaderPass(FXAAShader);
(tonemappingPass.uniforms as any).exposure.value = 0.5;
(fxaaPass.uniforms as any).resolution.value.set(1 / canvas.width, 1 / canvas.height);
composer.addPass(glassPass);
composer.addPass(bloomPass);
composer.addPass(tonemappingPass);
composer.addPass(fxaaPass);

// HDR pipeline
composer.renderTarget1.texture.type = HalfFloatType;
composer.renderTarget2.texture.type = HalfFloatType;
bloomPass.renderTargetBright.texture.type = HalfFloatType;
for (let i = 0; i < bloomPass.nMips; i++) {
    bloomPass.renderTargetsVertical[i].texture.type = HalfFloatType;
    bloomPass.renderTargetsHorizontal[i].texture.type = HalfFloatType;
}

loadMainScene().then(({opaque, glass}) => {
    scene.add(opaque);
    glassScene.add(glass);

    new CubeTextureLoader().setPath( './asset/skybox/' )
    .load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'].map(a => 'SkyMidNight_' + a), cubemap => {
        scene.background = cubemap;
    });

    // let cubecamera = new CubeCamera(0.1, 10, 512);
    // cubecamera.position.set(-13.652, 1.7, 4);
    // cubecamera.update(renderer, scene);
    // glassScene.traverse((mesh: Mesh) => {
    //     if (mesh.material) {
    //         let material = mesh.material as MeshStandardMaterial;
    //         material.envMap = cubecamera.renderTarget.texture;
    //         material.needsUpdate = true;
    //     }
    // })
})

let cameraAnimationNode = new Group();
cameraAnimationNode.add(camera);
scene.add(cameraAnimationNode);
let mixer = new AnimationMixer(cameraAnimationNode);

let inited = false;
let animating = false;
let audio = new Audio();
let cameraAnimationClip;
new GLTFLoader().load('asset/camera.gltf', gltf => {
    cameraAnimationClip = gltf.animations[0];
    if (inited) {
        playCameraAnimation();
    }
});

function playCameraAnimation() {
    animating = true;
    let action = mixer.clipAction(cameraAnimationClip).play();

    camera.rotation.y = -Math.PI / 2;
    camera.position.set(0, 0, -0.8);

    action.timeScale = 2;
    action.clampWhenFinished = true;
    action.setLoop(LoopOnce, 1);
}

function init() {
    if (inited) {
        return;
    }
    audio.src = './asset/bensound-scifi.mp3';
    audio.loop = true;
    audio.oncanplay = () => {
        audio.play();

    }
    inited = true;
    if (cameraAnimationClip) {
        playCameraAnimation();
    }
}


document.onclick = () => {
    init();
    // controls.enable();
}

mixer.addEventListener('finished', e => {
    animating = false;
    controls.enable();

    let cameraWorldMatrix = camera.matrixWorld.clone();
    scene.remove(cameraAnimationNode);
    cameraAnimationNode.remove(camera);
    cameraWorldMatrix.decompose(camera.position, camera.quaternion, camera.scale);
});

// Procedural city
let city = new City();
scene.add(city.group);

let glass = new Mesh(new BoxBufferGeometry(), new MeshStandardMaterial({
    color: new Color(191 / 255, 218 / 255, 245 / 255),
    opacity: 0.9,
    transparent: true,
    roughness: 0,
    metalness: 0
}));
glass.scale.set(1, 1, 0.2);
glass.position.set(-13.652, 1.7, 4);
let glassLight = new DirectionalLight();
glassLight.position.set(1, 2, 0.1);
glassScene.add(glassLight);
// glassScene.add(glass);


let controls = new KeyboardControl(camera, canvas);
// let controls = new OrbitControls(camera, renderer.domElement);
let navAgent: NavigationAgent;

new GLTFLoader().load('asset/navmesh.gltf', gltf => {
    let geometries: BufferGeometry[] = [];

    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(node => {
        let mesh = node as Mesh;
        if (mesh.geometry) {
            let geometry = mesh.geometry as BufferGeometry;
            geometry.applyMatrix(mesh.matrixWorld);
            geometries.push(geometry);
        }
    });
    let navmesh = new Mesh(
        BufferGeometryUtils.mergeBufferGeometries(geometries),
        new MeshBasicMaterial()
    );

    navAgent = new NavigationAgent(camera, navmesh);
    // debug
    // navmesh.material = new MeshBasicMaterial({
    //     color: new Color(100 / 255, 128 / 255, 245 / 255)
    // });
    // navmesh.position.y += 0.02;
    // let navmeshWireframe = navmesh.clone();
    // navmeshWireframe.position.y += 0.002;
    // navmeshWireframe.material = new MeshBasicMaterial({
    //     color: new Color(0, 0, 0),
    //     wireframe: true
    // });
    // scene.add(navmesh);
    // scene.add(navmeshWireframe);
});


let time = Date.now();
function update() {
    let time2 = Date.now();
    let dTime = time2 - time;
    time = time2;
    if (animating) {
        mixer.update(dTime / 1000);
    }
    else if (controls.enabled) {
        controls.update(dTime);
        if (navAgent) {
            navAgent.update();
        }
    }
    city.update(dTime);
    // renderer.render(scene, camera);
    composer.render();
    requestAnimationFrame(update);
}
requestAnimationFrame(update);