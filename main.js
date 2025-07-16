import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Check if we're on the solutions page
const isSolutionsPage = window.location.pathname.includes('solutions.html');

// Initialize Three.js scene
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x111111);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 3;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;
controls.target = new THREE.Vector3(0, 1, 0);

// Lighting setup
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(0, 10, 0);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 20;
scene.add(directionalLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
backLight.position.set(0, 5, 5);
scene.add(backLight);

// Model management
let currentModel = null;
const models = {};
const loader = new GLTFLoader();

// Function to prepare model
function prepareModel(model, isCar = false) {
    // Center the model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    
    // Scale adjustment - larger scale for car
    if (isCar) {
        model.scale.set(1.2, 1.2, 1.2);
    } else {
        model.scale.set(0.8, 0.8, 0.8);
    }
    
    // Set up model materials
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (child.material) {
                child.material.needsUpdate = true;
                if (typeof child.material.roughness !== 'undefined') {
                    child.material.roughness = 0.6;
                }
                if (typeof child.material.metalness !== 'undefined') {
                    child.material.metalness = 0.1;
                }
            }
        }
    });
    return model;
}

// First load the car model immediately (only on main page)
if (!isSolutionsPage) {
    loadCarModel();
} else {
    loadOtherModels();
    document.getElementById('progress-container').style.display = 'none';
}

function loadCarModel() {
    const carPath = 'public/city_gltf/scene.gltf';
    
    loader.load(
        carPath,
        (gltf) => {
            console.log('Concept car model loaded successfully');
            const model = prepareModel(gltf.scene, true);
            scene.add(model);
            currentModel = model;
            models.car = model;
            document.getElementById('progress-container').style.display = 'none';
            loadOtherModels();
        },
        (xhr) => {
            const percentLoaded = (xhr.loaded / xhr.total * 100).toFixed(0);
            document.getElementById('progress-container').textContent = 
                `LOADING CONCEPT CAR... ${percentLoaded}%`;
        },
        (error) => {
            console.error('Error loading concept car:', error);
            document.getElementById('progress-container').textContent = 
                'ERROR LOADING CONCEPT CAR. CHECK CONSOLE FOR DETAILS.';
            loadOtherModels();
        }
    );
}

// Load other models for scrolling sections
function loadOtherModels() {
    const modelPaths = {
        livingroom: 'public/cozy_living_room_baked_gltf/scene.gltf',
        bedroom: 'public/millennium_falcon/scene.gltf',
        kitchen: 'public/city_gltf/scene.gltf'
    };

    for (const [key, path] of Object.entries(modelPaths)) {
        loader.load(
            path,
            (gltf) => {
                console.log(`Loaded ${key} model`);
                const model = prepareModel(gltf.scene);
                model.visible = false;
                scene.add(model);
                models[key] = model;
                
                // On solutions page, show first model by default
                if (isSolutionsPage && key === 'livingroom' && !currentModel) {
                    currentModel = model;
                    model.visible = true;
                }
            },
            undefined,
            (error) => {
                console.error(`Error loading ${key} model:`, error);
            }
        );
    }
}

// Handle model switching for scroll sections
function handleScroll() {
    const sections = document.querySelectorAll(isSolutionsPage ? '.solution-section' : '.industry-section');
    const scrollPosition = window.scrollY;
    
    // Show default model if we're at the top (only on main page)
    if (!isSolutionsPage && scrollPosition < sections[1].offsetTop - window.innerHeight / 2) {
        if (currentModel && currentModel !== models.car) {
            currentModel.visible = false;
            models.car.visible = true;
            currentModel = models.car;
            directionalLight.target = currentModel;
            directionalLight.target.updateMatrixWorld();
        }
        return;
    }
    
    // Handle sections
    sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop - window.innerHeight / 2 && 
            scrollPosition < sectionTop + sectionHeight - window.innerHeight / 2) {
            const modelKey = section.getAttribute('data-model');
            switchModel(modelKey);
        }
    });
}

function switchModel(modelKey) {
    if (currentModel) {
        currentModel.visible = false;
    }
    
    if (modelKey && models[modelKey]) {
        currentModel = models[modelKey];
        currentModel.visible = true;
        directionalLight.target = currentModel;
        directionalLight.target.updateMatrixWorld();
    }
}

// Event listeners
window.addEventListener('scroll', handleScroll);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();