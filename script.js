// --- URL Fragment State Management ---

// Encode the current room state into a URL fragment string
function encodeStateToFragment(rooms, excluded) {
    // Check if the current state is the default state
    if (isStateDefault(rooms, excluded)) {
        return ''; // Return empty string if state is default
    }
    
    // New encoding format: each room is stored with its availability (0=excluded, 1=included)
    const encodedRooms = rooms.map(room => {
        const isAvailable = !excluded.has(room) ? 1 : 0;
        return `${encodeURIComponent(room)}:${isAvailable}`;
    }).join('|');
    
    const params = new URLSearchParams();
    params.set('r', encodedRooms); // Using 'r' for brevity in the URL
    
    return '#' + params.toString();
}

// Decode the room state from a URL fragment string
function decodeStateFromFragment(fragment) {
    if (!fragment || fragment.length <= 1) {
        return null; // No valid fragment
    }
    
    try {
        const params = new URLSearchParams(fragment.substring(1)); // Remove '#'
        const roomsParam = params.get('r');
        
        // If there's no 'r' parameter, return null
        if (!roomsParam) {
            return null;
        }
            
        const loadedRooms = [];
        const loadedExcluded = new Set();
        
        // Parse each room and availability
        roomsParam.split('|').forEach(roomData => {
            const [encodedRoom, availabilityStr] = roomData.split(':');
            if (encodedRoom) {
                const room = decodeURIComponent(encodedRoom);
                loadedRooms.push(room);
                
                // If availability is explicitly 0, mark as excluded
                if (availabilityStr === '0') {
                    loadedExcluded.add(room);
                }
            }
        });
        
        // Basic validation: Ensure loaded rooms are reasonable (e.g., at least 6)
        if (loadedRooms.length < 6) {
             console.warn("Loaded room list has less than 6 rooms. Falling back to default.");
             return null;
        }

        return { rooms: loadedRooms, excluded: loadedExcluded };
    } catch (e) {
        console.error("Error decoding fragment:", e);
        return null; // Indicate failure
    }
}

// Check if the current state matches the default state
function isStateDefault(rooms, excluded) {
    // Only consider default if:
    // 1. Room list matches initialRooms exactly (order doesn't matter)
    // 2. No rooms are excluded
    
    // Check if room lists have the same elements
    const sortedRooms = [...rooms].sort();
    const sortedInitial = [...initialRooms].sort();
    
    if (sortedRooms.length !== sortedInitial.length) {
        return false; // Different count = not default
    }
    
    // Check if all elements match
    for (let i = 0; i < sortedRooms.length; i++) {
        if (sortedRooms[i] !== sortedInitial[i]) {
            return false; // Different room = not default
        }
    }
    
    // Check if any exclusions
    if (excluded.size > 0) {
        return false; // Has exclusions = not default
    }
    
    return true; // Matches initialRooms and no exclusions
}

// Update the URL fragment based on the current state
function updateURLFragment() {
    const fragment = encodeStateToFragment(allRooms, excludedRooms);
    // Use replaceState to avoid adding to browser history for each change
    history.replaceState(null, '', fragment || window.location.pathname + window.location.search); 
}

// --- Load State from URL Fragment on Page Load ---
function loadStateFromURL() {
    const fragment = window.location.hash;
    const loadedState = decodeStateFromFragment(fragment);
    
    if (loadedState) {
        console.log("Loading state from URL fragment:", loadedState);
        allRooms = loadedState.rooms;
        excludedRooms.clear(); // Clear existing default
        loadedState.excluded.forEach(room => excludedRooms.add(room));
    } else {
        console.log("No valid fragment found or state is default. Using default rooms.");
        // Ensure allRooms is set to the initialRooms if loading failed or no fragment
        allRooms = [...initialRooms]; 
        excludedRooms.clear();
    }
    // Always update the fragment after load to ensure consistency (e.g., remove if default)
    // updateURLFragment(); // Call this AFTER initial UI setup might be better
}
// --- END URL Fragment State Management ---

// --- Basic Setup ---
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x87ceeb); // Sky blue background - REMOVED FOR SKYBOX

// --- NEW: User Excluded Rooms State ---
const excludedRooms = new Set(); // Will be populated by loadStateFromURL if fragment exists
// --------------------------------------

// --- NEW: Room Management ---
// Deep copy the initial rooms to allow reset functionality
const initialRooms = [
    "Kitchen", "Butlers Pantry", "Family Room", "Downstairs bathroom", "Garage", 
    "Downstairs bedroom", "Ella's Room", "Aurora's Room", "Upstairs landing", 
    "Main bedroom", "Walk in Robe", "Main bathroom", "Kids bathroom"
];
// Main rooms array that can be modified - initialized later by loadStateFromURL
let allRooms = []; 
// --------------------------------------

// --- Load State ---
loadStateFromURL(); // Load rooms and exclusions from URL fragment FIRST
// ------------------

// --- Skybox ---
function createSkybox() {
    const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
    `;

    const uniforms = {
        topColor: { value: new THREE.Color(0xFFB88C) }, // Orange/Pinkish
        bottomColor: { value: new THREE.Color(0x4B0082) }, // Indigo/Dark Purple
        offset: { value: 33 },
        exponent: { value: 0.6 }
    };

    const skyGeo = new THREE.BoxGeometry(1000, 1000, 1000); // Large enough to encompass the scene
    const skyMat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide // Render on the inside
    });

    const skybox = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skybox);
}

// Call the function to create the skybox
createSkybox();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 7; // Adjusted camera position
camera.position.y = 5;

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('dice-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadows

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
// Configure shadow properties
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
scene.add(directionalLight);

// --- Physics (Cannon.js) ---
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Apply gravity
world.broadphase = new CANNON.NaiveBroadphase(); // Simple broadphase for performance
world.solver.iterations = 10; // Physics solver iterations

// Materials
const diceMaterial = new CANNON.Material('diceMaterial');
const groundMaterial = new CANNON.Material('groundMaterial');
const contactMaterial = new CANNON.ContactMaterial(groundMaterial, diceMaterial, {
    friction: 0.1,
    restitution: 0.5 // Bounciness
});
world.addContactMaterial(contactMaterial);

// --- Floor ---
// Generate a checkerboard texture
function createFloorTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const checkSize = size / 8; // Size of each check
    const color1 = '#c2c2c2'; // Light grey
    const color2 = '#a3a3a3'; // Dark grey

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? color1 : color2;
            ctx.fillRect(c * checkSize, r * checkSize, checkSize, checkSize);
        }
    }
    return new THREE.CanvasTexture(canvas);
}

const floorTexture = createFloorTexture();
floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(2, 2); // Adjust repeat for smaller floor size

const floorGeometry = new THREE.PlaneGeometry(10, 10); // Match bounding box size
// Use MeshStandardMaterial with the texture map
const floorMaterial = new THREE.MeshStandardMaterial({ 
    map: floorTexture, 
    side: THREE.DoubleSide 
});
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
floorMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
floorMesh.receiveShadow = true;
scene.add(floorMesh);

// --- Visual Bounding Box (Transparent Cube) ---
const boxSize = 10; // New smaller size
const boxHeight = 10; // Keep it a cube
const boundingBoxGeometry = new THREE.BoxGeometry(boxSize, boxHeight, boxSize);
const boundingBoxMaterial = new THREE.MeshStandardMaterial({
    color: 0xadd8e6, // Light blue color
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide // Render the inside faces
});
const boundingBoxMesh = new THREE.Mesh(boundingBoxGeometry, boundingBoxMaterial);
// Position the center of the box. Since the floor is at y=0, the center is at y=height/2.
boundingBoxMesh.position.y = boxHeight / 2 + 0.01; // Slightly raise to avoid Z-fighting
scene.add(boundingBoxMesh);

// Physics Floor
const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({ mass: 0, material: groundMaterial }); // mass 0 makes it static
floorBody.addShape(floorShape);
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Match visual rotation
world.addBody(floorBody);

// --- Physics Bounding Walls (Invisible) ---
function createWall(position, rotation = null) {
    // Create invisible physics wall
    const wallShape = new CANNON.Plane();
    const wallBody = new CANNON.Body({ mass: 0 }); // Static body
    wallBody.addShape(wallShape);
    wallBody.position.copy(position);
    
    if (rotation) {
        wallBody.quaternion.setFromAxisAngle(
            new CANNON.Vec3(rotation.axis.x, rotation.axis.y, rotation.axis.z),
            rotation.angle
        );
    }
    
    world.addBody(wallBody);
}

// Create bounding walls (forming a box) - adjusted for smaller size
const physicsWallSize = 10; // Match the visual box size
const physicsWallHeight = 10; // Match the visual box height
// Front wall (+Z)
createWall(new CANNON.Vec3(0, physicsWallHeight / 2, -physicsWallSize / 2), { axis: { x: 0, y: 1, z: 0 }, angle: 0 });
// Back wall (-Z)
createWall(new CANNON.Vec3(0, physicsWallHeight / 2, physicsWallSize / 2), { axis: { x: 0, y: 1, z: 0 }, angle: Math.PI });
// Left wall (-X)
createWall(new CANNON.Vec3(-physicsWallSize / 2, physicsWallHeight / 2, 0), { axis: { x: 0, y: 1, z: 0 }, angle: Math.PI / 2 });
// Right wall (+X)
createWall(new CANNON.Vec3(physicsWallSize / 2, physicsWallHeight / 2, 0), { axis: { x: 0, y: 1, z: 0 }, angle: -Math.PI / 2 });
// Ceiling (+Y)
createWall(new CANNON.Vec3(0, physicsWallHeight, 0), { axis: { x: 1, y: 0, z: 0 }, angle: Math.PI / 2 }); 
// Floor (-Y is handled by the floorBody plane)
// NOTE: The createWall calls remain to define the invisible PHYSICS boundaries

// --- Dice Data ---

// Randomly select 6 rooms for this game session
function selectRandomRooms() {
    // Filter out user-excluded rooms first
    const availableRooms = allRooms.filter(room => !excludedRooms.has(room));

    // Check if we have at least 6 available rooms
    if (availableRooms.length >= 6) {
        // Shuffle the available rooms using Fisher-Yates algorithm
        const shuffled = [...availableRooms];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Select the first 6
        const selected = shuffled.slice(0, 6);
        
        console.log("Available for selection:", availableRooms);
        console.log("Selected for dice:", selected);
        return selected;
    } 
    else {
        // Not enough rooms after exclusion, so include ALL available rooms
        // and fill in any remaining spots with "Empty"
        const selected = [...availableRooms];
        console.log("Warning: Only " + availableRooms.length + " rooms available after exclusions");
        
        // Pad with "Empty" if needed
        while (selected.length < 6) {
            selected.push("Empty");
        }
        
        console.log("Available for selection:", availableRooms);
        console.log("Selected for dice (with padding):", selected);
        return selected;
    }
}

// Select rooms for this session
// const rooms = selectRandomRooms(); // REMOVED - will be set in initDice
let currentDiceRooms = []; // Initialize global variable for current dice rooms
// console.log("Rooms for this session:", rooms); // REMOVED

const times = [5, 10, 15, 20, 25, 30]; // 6 durations for D6 (in minutes)

// Store references to dice bodies/meshes
const diceObjects = [];

// --- Dice Objects ---
// Create D6 dice for both rooms and time
let roomDice, timeDice;

// Make sure we have exactly 6 room values
function initDice() {
    // Get the latest selection of rooms based on exclusions
    const selectedRoomsForDice = selectRandomRooms();
    // Update the global variable for UI updates
    currentDiceRooms = selectedRoomsForDice;
    console.log("Updated currentDiceRooms:", currentDiceRooms);
    
    // Prepare time values (these don't change)
    const timeValues = [...times];
    while (timeValues.length < 6) timeValues.push(5);
    if (timeValues.length > 6) timeValues.length = 6;
    
    // --- Check and Create/Update Room Dice ---
    if (roomDice) { 
        // Room dice exists, update its values and faces
        console.log("Updating existing room dice.");
        roomDice.values = currentDiceRooms; // Use updated global variable
        updateDiceFaces(roomDice);
    } else {
        // Room dice doesn't exist, create it
        console.log("Creating new room dice.");
        roomDice = createDice(1.3, diceMaterial, currentDiceRooms, true); // Use updated global variable
    }

    // --- Check and Create/Update Time Dice ---
    if (timeDice) {
        // Time dice exists, update its values and faces (though times don't change currently)
        // This is good practice in case times become dynamic later
        console.log("Updating existing time dice.");
        timeDice.values = timeValues;
        updateDiceFaces(timeDice);
    } else {
        // Time dice doesn't exist, create it
        console.log("Creating new time dice.");
        timeDice = createDice(1, diceMaterial, timeValues, false);
    }
    // Removed the old direct createDice calls
    // roomDice = createDice(1.3, diceMaterial, roomValues, true); 
    // timeDice = createDice(1, diceMaterial, timeValues);   
}

// Initialize dice
initDice();

// --- Helper Function for Text Wrapping ---
function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let lines = [];
    let currentY = y;

    for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = context.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push({ text: line.trim(), y: currentY });
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    lines.push({ text: line.trim(), y: currentY });
    
    // Calculate total height and center vertically
    const totalHeight = lines.length * lineHeight;
    const startY = y - totalHeight / 2 + lineHeight / 2; // Adjust start based on total height
    
    lines.forEach((lineData, index) => {
        context.fillText(lineData.text, x, startY + index * lineHeight);
    });
}

// --- Helper Function to Update Dice Faces --- 
function updateDiceFaces(dice) {
    const isRoomDice = dice.type === 'roomDice';
    const size = dice.mesh.geometry.parameters.width; // Get size from existing geometry
    const values = dice.values;
    
    // Colors for each face (same as in createDice)
    const faceColors = [
        0xffffff, 0xffff00, 0x00ff00, 0xff0000, 0xff9900, 0x0000ff
    ];
    
    console.log(`Updating faces for ${dice.type} with values:`, values);
    
    const textCanvasSize = 256;
    const padding = 16;
    const contentWidth = textCanvasSize - 2 * padding;

    for (let i = 0; i < 6; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = textCanvasSize;
        canvas.height = textCanvasSize;
        const ctx = canvas.getContext('2d');
        
        // Background with face color
        ctx.fillStyle = '#' + faceColors[i].toString(16).padStart(6, '0');
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add a border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = padding; 
        ctx.strokeRect(padding / 2, padding / 2, canvas.width - padding, canvas.height - padding);
        
        ctx.fillStyle = '#000'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Get the specific value for this face, handle potential "Empty"
        const faceValue = values[i] !== undefined ? values[i] : (isRoomDice ? "Empty" : "-");

        if (isRoomDice) {
            const fontSize = 36;
            const lineHeight = fontSize * 1.1;
            ctx.font = `bold ${fontSize}px Arial`;
            wrapText(ctx, faceValue.toString(), canvas.width / 2, canvas.height / 2, contentWidth, lineHeight);
        } else {
            ctx.font = 'bold 128px Arial';
            ctx.fillText(faceValue.toString(), canvas.width / 2, canvas.height / 2);
        }
        
        const oldTexture = dice.mesh.material[i].map;
        const newTexture = new THREE.CanvasTexture(canvas);
        
        dice.mesh.material[i].map = newTexture;
        dice.mesh.material[i].needsUpdate = true;
        
        // Dispose the old texture AFTER assigning the new one
        if (oldTexture) {
            oldTexture.dispose();
        }
    }
}

// --- Dice Creation Function (Minor change: returns diceObj) ---
function createDice(size, material, values, isRoomDice = false) {
    // Visual Dice (Three.js) - Using BoxGeometry for D6
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    // Create materials for each face
    const materials = [];
    
    // Colors for each face
    const faceColors = [
        0xffffff, // white - right (+x)
        0xffff00, // yellow - left (-x)
        0x00ff00, // green - top (+y)
        0xff0000, // red - bottom (-y)
        0xff9900, // orange - front (+z)
        0x0000ff  // blue - back (-z)
    ];
    
    console.log(`${isRoomDice ? 'Room' : 'Time'} values:`, values);
    
    const textCanvasSize = 256;
    const padding = 16;
    const contentWidth = textCanvasSize - 2 * padding;

    for (let i = 0; i < 6; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = textCanvasSize;
        canvas.height = textCanvasSize;
        const ctx = canvas.getContext('2d');
        
        // Background with face color
        ctx.fillStyle = '#' + faceColors[i].toString(16).padStart(6, '0');
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add a border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = padding; // Use padding for linewidth
        ctx.strokeRect(padding / 2, padding / 2, canvas.width - padding, canvas.height - padding);
        
        ctx.fillStyle = '#000'; // Text color
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; // Baseline helps with centering

        if (isRoomDice) {
            const fontSize = 36;
            const lineHeight = fontSize * 1.1; // Adjust line height slightly
            ctx.font = `bold ${fontSize}px Arial`;
            wrapText(ctx, values[i], canvas.width / 2, canvas.height / 2, contentWidth, lineHeight);
        } else {
            ctx.font = 'bold 128px Arial';
            ctx.fillText(values[i].toString(), canvas.width / 2, canvas.height / 2);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        const faceMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.4,
            metalness: 0.1
        });
        
        materials.push(faceMaterial);
    }
    
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.position.y = size / 2 + 0.1;
    scene.add(mesh);
    
    // Physical Dice (Cannon.js)
    const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
    const body = new CANNON.Body({
        mass: 1,
        material: material,
        shape: shape,
        angularDamping: 0.5,
        linearDamping: 0.1
    });
    body.position.copy(mesh.position);
    world.addBody(body);
    
    const diceObj = {
        mesh,
        body,
        type: isRoomDice ? 'roomDice' : 'timeDice',
        values: values
    };
    diceObjects.push(diceObj);
    mesh.visible = false;
    body.sleep();
    return diceObj;
}

// Initially hide all dice
diceObjects.forEach(d => d.mesh.visible = false);


// --- Controls ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth camera movement
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false; // Prevent awkward panning
controls.maxPolarAngle = Math.PI / 2; // Limit camera angle


// --- Game State & UI ---
let gameState = 'ROLL_DICE'; // Initial state (renamed from ROLL_ROOM)
let selectedRoom = null;
let selectedTime = null;
let timerInterval = null;
let timeRemaining = 0;
let timerPaused = false; // New flag for pause state
let diceRolling = false; // Flag to check if dice are active
let diceSettling = false; // Flag to track when dice are settling
let settledDice = 0; // Count how many dice have settled

// Variables for hold-to-roll mechanic
let holdStartTime = 0;
let holdInterval = null; // Interval timer for updating power bar
const minForce = 20;
const maxForce = 70;
const minTorque = 20;
const maxTorque = 50;
const maxHoldDuration = 1500;

// DOM Elements
const uiContainer = document.getElementById('ui-container');
const stateRollRoom = document.getElementById('state-roll-room');
const stateTimer = document.getElementById('state-timer');
const stateComplete = document.getElementById('state-complete');
const allRoomsListEl = document.getElementById('all-rooms-list'); // NEW: Reference for room list
const allRoomsTitleEl = document.getElementById('all-rooms-title'); // NEW: Reference for room list title

const rollRoomBtn = document.getElementById('roll-room-btn');
const playAgainBtn = document.getElementById('play-again-btn');

const choreDetailsEl = document.getElementById('chore-details');
const timerDisplayEl = document.getElementById('timer-display');
const timerControlBtn = document.getElementById('timer-control-btn'); // Get reference to the new button

// Sound (basic)
const applauseSound = new Audio('https://www.soundjay.com/human/applause-01.mp3'); // Example sound URL

// --- Game Logic Functions ---

function updateUI() {
    // Hide all states first
    stateRollRoom.classList.add('hidden');
    stateTimer.classList.add('hidden');
    stateComplete.classList.add('hidden');
    timerControlBtn.classList.add('hidden'); // Hide timer button by default

    // Show current state
    if (gameState === 'ROLL_DICE') {
        stateRollRoom.classList.remove('hidden');
        document.querySelector('#state-roll-room p').textContent =
            'Hold & Release to roll the dice!'; 
        rollRoomBtn.textContent = 'Roll Dice';
        rollRoomBtn.disabled = false; 
        timerDisplayEl.classList.add('inactive-timer'); // Timer is inactive here
        timerControlBtn.classList.remove('pulsing'); // Not pulsing here

        diceObjects.forEach(d => d.mesh.visible = false);
    } else if (gameState === 'TIMER') {
        stateTimer.classList.remove('hidden');
        choreDetailsEl.textContent = `${selectedRoom} for ${selectedTime} minutes`;
        updateTimerDisplay(); 
        timerControlBtn.classList.remove('hidden'); 

        // Set button text AND pulsing/inactive states
        if (timerInterval) { // Timer interval exists (running or paused)
            if (timerPaused) {
                timerControlBtn.textContent = 'Resume';
                timerControlBtn.classList.add('pulsing'); // Pulse when paused
                timerDisplayEl.classList.add('inactive-timer'); // Red text when paused
            } else {
                timerControlBtn.textContent = 'Pause';
                timerControlBtn.classList.remove('pulsing'); // No pulse when running
                timerDisplayEl.classList.remove('inactive-timer'); // Normal text when running
            }
        } else { // Timer hasn't started yet
            timerControlBtn.textContent = 'Start Timer';
            timerControlBtn.classList.add('pulsing'); // Pulse before start
            timerDisplayEl.classList.add('inactive-timer'); // Red text before start
        }

    } else if (gameState === 'COMPLETE') {
        stateComplete.classList.remove('hidden');
        timerDisplayEl.classList.add('inactive-timer'); // Timer is inactive here
        timerControlBtn.classList.remove('pulsing'); // Not pulsing here
        showCelebration();
    }
}

// --- NEW: Populate All Rooms List --- 
function populateAllRoomsList() {
    if (!allRoomsListEl) return; // Safety check
    
    // Update the title dynamically
    if (allRoomsTitleEl) {
        const roomCount = allRooms.length;
        allRoomsTitleEl.textContent = `${roomCount} Possible Rooms`;
    }

    allRoomsListEl.innerHTML = ''; // Clear existing list
    const sortedRooms = [...allRooms].sort(); // Sort alphabetically
    
    sortedRooms.forEach(room => {
        const li = document.createElement('li');
        li.className = 'room-item';
        
        // Create room name span (clickable for exclude/include)
        const roomNameSpan = document.createElement('span');
        roomNameSpan.className = 'room-name';
        roomNameSpan.textContent = room;
        // Apply excluded style if room is in the set
        if (excludedRooms.has(room)) {
            roomNameSpan.classList.add('excluded-room');
        }
        
        // Create actions container
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'room-actions';
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-room-btn';
        deleteBtn.innerHTML = '&times;'; // × symbol
        deleteBtn.title = 'Delete room';
        
        // Disable delete if minimum rooms would be violated
        const minRoomsNeeded = 6;
        if (allRooms.length <= minRoomsNeeded) {
            deleteBtn.disabled = true;
            deleteBtn.title = 'Cannot delete: minimum of 6 rooms required';
        }
        
        // Add elements to the list item
        li.appendChild(roomNameSpan);
        li.appendChild(actionsDiv);
        actionsDiv.appendChild(deleteBtn);
        
        allRoomsListEl.appendChild(li);
    });
}

// --- Room Management Functions ---
function addRoom(roomName) {
    // Basic validation
    if (!roomName || roomName.trim() === '') return false;
    roomName = roomName.trim();
    
    // Check for duplicates (case insensitive)
    if (allRooms.some(r => r.toLowerCase() === roomName.toLowerCase())) {
        alert("This room already exists!");
        return false;
    }
    
    // Add to rooms array
    allRooms.push(roomName);
    // Update the UI and dice
    populateAllRoomsList();
    initDice();
    updateURLFragment();
    return true;
}

function deleteRoom(roomName) {
    const minRoomsNeeded = 6;
    
    // Don't allow deletion if it would leave fewer than minimum rooms
    if (allRooms.length <= minRoomsNeeded) {
        alert(`Cannot delete: minimum of ${minRoomsNeeded} rooms required`);
        return false;
    }
    
    // Find the room's index
    const index = allRooms.findIndex(r => r === roomName);
    if (index === -1) return false;
    
    // Remove from arrays
    allRooms.splice(index, 1);
    // Also remove from excluded set if it's there
    if (excludedRooms.has(roomName)) {
        excludedRooms.delete(roomName);
    }
    
    // Update the UI and dice
    populateAllRoomsList();
    initDice();
    updateURLFragment();
    return true;
}

// Modified rollDice function to accept force/torque magnitudes
function rollDice(dice, forceMagnitude, torqueMagnitude) {
    // Apply random force and torque *directions*, but use calculated magnitudes

    // Apply impulse slightly off-center and upwards
    const impulsePoint = new CANNON.Vec3(
        (Math.random() - 0.5) * dice.mesh.geometry.parameters.width * 0.5,
        (Math.random() - 0.5) * dice.mesh.geometry.parameters.height * 0.5,
        (Math.random() - 0.5) * dice.mesh.geometry.parameters.depth * 0.5
    );
     const forceDirection = new CANNON.Vec3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.5 + 0.5, // Primarily upward force
        (Math.random() - 0.5) * 2
    );
    forceDirection.normalize();
    forceDirection.scale(forceMagnitude, forceDirection);
    dice.body.applyImpulse(forceDirection, impulsePoint);

    // Apply random torque (rotation)
    const torqueDirection = new CANNON.Vec3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
    );
    torqueDirection.normalize();
    torqueDirection.scale(torqueMagnitude, torqueDirection);
    // Apply angular velocity directly for better control
    dice.body.angularVelocity.set(torqueDirection.x, torqueDirection.y, torqueDirection.z);

    // Wait a bit before checking for dice to settle to ensure it starts moving first
    setTimeout(() => {
        diceSettling = true;
        checkDiceSettled(dice);
    }, 500); // Start checking after 0.5 seconds
}

function resetDicePosition(dice) {
    // Reset physics state
    dice.body.velocity.set(0, 0, 0);
    dice.body.angularVelocity.set(0, 0, 0);
    // Position near the center of the floor area
    const size = dice.mesh.geometry.parameters.height; // Get dice size
    dice.body.position.set(
        (Math.random() * 2 - 1) * 3,  // Keep X between -3 and 3
        size / 2 + 0.1 + Math.random() * 0.2, // Place just above floor with slight random height
        (Math.random() * 2 - 1) * 3   // Keep Z between -3 and 3
    );
    // Random initial rotation
    dice.body.quaternion.setFromEuler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
    );
    dice.mesh.position.copy(dice.body.position); // Sync mesh
    dice.mesh.quaternion.copy(dice.body.quaternion); // Sync mesh
    dice.body.wakeUp(); // Make sure physics body is active for the roll
}

function checkDiceSettled(dice) {
    // Only check if we're in settling phase
    if (!diceSettling) return;
    
    const sleepThreshold = 0.2; // How slow must it be to be considered 'settled'
    if (dice.body.sleepState === CANNON.Body.SLEEPING || (dice.body.velocity.lengthSquared() < sleepThreshold && dice.body.angularVelocity.lengthSquared() < sleepThreshold) ) {
        console.log(dice.type + " settled!");
        
        // Add a small delay to allow the dice to visually finish settling
        setTimeout(() => {
            // Determine the result for this individual die
            determineResult(dice);
            
            // Increment counter of settled dice
            settledDice++;
            
            // If both dice have settled, move to the next game state
            if (settledDice === 2) {
                diceRolling = false;
                diceSettling = false;
                // Don't disable roll button here, handled in resetGame/handleRollEnd
                
                // Set timer state and initial time remaining
                timeRemaining = selectedTime * 60; // Set initial time in seconds
                gameState = 'TIMER';
                updateUI(); // Update UI to show Timer state with "Start Timer" button
            }
        }, 500); // Wait half second for visual completion
    } else {
        // Keep checking
        dice.body.wakeUp(); // Ensure it doesn't fall asleep prematurely if still moving slightly
        setTimeout(() => checkDiceSettled(dice), 100); // Check again shortly
    }
}

function determineResult(dice) {
    // Determine which face is pointing up based on the dice orientation
    // For a cube, we check which of the 6 normal vectors is most aligned with the world up vector
    
    // World up vector
    const worldUp = new CANNON.Vec3(0, 1, 0);
    
    // The 6 possible face normal vectors in local dice space
    // Order MUST match the order materials are applied by BoxGeometry: +x, -x, +y, -y, +z, -z
    const faceNormals = [
        new CANNON.Vec3(1, 0, 0),   // right (+X) - Mat index 0
        new CANNON.Vec3(-1, 0, 0),  // left (-X) - Mat index 1
        new CANNON.Vec3(0, 1, 0),   // top (+Y) - Mat index 2
        new CANNON.Vec3(0, -1, 0),  // bottom (-Y) - Mat index 3
        new CANNON.Vec3(0, 0, 1),   // front (+Z) - Mat index 4
        new CANNON.Vec3(0, 0, -1)   // back (-Z) - Mat index 5
    ];
    
    // Transform each normal by the dice's current rotation
    let maxDot = -Infinity;
    let topFaceIndex = -1;
    let alignments = [];
    
    for (let i = 0; i < faceNormals.length; i++) {
        // Create a copy of the normal
        const normal = faceNormals[i].clone();
        
        // Transform it to world space using the body's quaternion
        dice.body.quaternion.vmult(normal, normal);
        
        // Compute dot product with world up vector
        const dot = normal.dot(worldUp);
        alignments.push({index: i, dot: dot});
        
        // Keep track of the face most aligned with up
        if (dot > maxDot) {
            maxDot = dot;
            topFaceIndex = i; // This index now corresponds to the material index
        }
    }
    
    // Sort alignments for debugging
    alignments.sort((a, b) => b.dot - a.dot);
    console.log(`${dice.type} - All face alignments:`, 
        alignments.map(a => `Face ${a.index} (${faceNormals[a.index].toArray().join(',')}): ${a.dot.toFixed(4)}`).join(', '));
    console.log(`${dice.type} - Top face index (Material Index): ${topFaceIndex}, Alignment value: ${maxDot.toFixed(4)}`);
    
    // Highlight the top face by changing its color (visual feedback)
    if (dice.mesh && dice.mesh.material && Array.isArray(dice.mesh.material)) {
        // First reset all faces to normal
        for (let i = 0; i < dice.mesh.material.length; i++) {
            // Remove any highlight
            if (dice.mesh.material[i].emissive) {
                dice.mesh.material[i].emissive.set(0x000000);
            }
        }
        
        // Highlight the top face (using the material index)
        if (dice.mesh.material[topFaceIndex] && dice.mesh.material[topFaceIndex].emissive) {
            dice.mesh.material[topFaceIndex].emissive.set(0x333333); // Subtle glow
        }
    }
    
    // Set result based on the dice type and top face index (which matches the material index)
    if (dice.type === 'roomDice') {
        selectedRoom = dice.values[topFaceIndex]; // Use the index directly
        console.log("Selected Room:", selectedRoom, "from face index", topFaceIndex);
    } else if (dice.type === 'timeDice') {
        selectedTime = dice.values[topFaceIndex]; // Use the index directly
        console.log("Selected Time:", selectedTime, "from face index", topFaceIndex);
    }
}

// Simplified startTimer function - only starts the interval
function startTimerInterval() {
    if (timerInterval) clearInterval(timerInterval);
    timerPaused = false;
    timerDisplayEl.classList.remove('inactive-timer'); // Timer is now active
    timerControlBtn.classList.remove('pulsing'); // Stop pulsing

    timerInterval = setInterval(() => {
        if (timerPaused) return; // Do nothing if paused

        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            gameState = 'COMPLETE';
            updateUI();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerDisplayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Update progress bar
    const totalDuration = selectedTime * 60; // Get total duration in seconds
    if (totalDuration > 0) {
        const percentageElapsed = ((totalDuration - timeRemaining) / totalDuration) * 100;
        timerDisplayEl.style.backgroundSize = `${percentageElapsed}% 100%`;
    } else {
        timerDisplayEl.style.backgroundSize = '0% 100%'; // Handle case where total duration might be 0
    }
}

let confettiInterval = null; // Store interval ID for confetti

function showCelebration() {
    console.log("Chore Complete! Playing celebration.");
    applauseSound.play().catch(e => console.error("Audio play failed:", e)); // Play sound

    // Stop any previous confetti interval
    if (confettiInterval) {
        // Make sure to clear interval, not animation frame
        clearInterval(confettiInterval); 
        confettiInterval = null;
    }

    const duration = 60 * 1000; // 1 minute in milliseconds
    // const animationEnd = Date.now() + duration;
    // let skew = 1;

    // function randomInRange(min, max) {
    //     return Math.random() * (max - min) + min;
    // }

    /* Comment out the requestAnimationFrame loop
    (function frame() {
        const timeLeft = animationEnd - Date.now();
        const ticks = Math.max(200, 500 * (timeLeft / duration));
        skew = Math.max(0.8, skew - 0.001);

        // Randomly launch confetti from left and right
        confetti({
            particleCount: 30, // Increased significantly
            startVelocity: 0,
            ticks: ticks,
            origin: { x: Math.random(), y: (Math.random() * skew) - 0.2 },
            // More vibrant and comprehensive rainbow palette
            colors: [
                '#FF0000', // Red
                '#FF7F00', // Orange
                '#FFFF00', // Yellow
                '#00FF00', // Lime Green
                '#00FF7F', // Spring Green
                '#00FFFF', // Cyan/Aqua
                '#007FFF', // Azure
                '#0000FF', // Blue
                '#7F00FF', // Violet
                '#FF00FF', // Magenta/Fuchsia
                '#FF007F', // Rose
                '#FF1493', // Deep Pink
                '#FF69B4', // Hot Pink
                '#ADFF2F', // Green Yellow
                '#FFA500', // Orange
                '#1E90FF'  // Dodger Blue
            ],
            shapes: ['circle', 'square'],
            gravity: randomInRange(0.4, 0.6),
            scalar: randomInRange(0.4, 1),
            drift: randomInRange(-0.4, 0.4)
        });

        if (timeLeft > 0) {
            confettiInterval = requestAnimationFrame(frame);
        } else {
            // Clear interval using cancelAnimationFrame if needed, though confetti stops on its own
            // if (confettiInterval) cancelAnimationFrame(confettiInterval);
            confettiInterval = null; 
        }
    }());
    */

    // --- Use setInterval for bursts --- 
    const interval = 250; // milliseconds between bursts
    const endTime = Date.now() + duration; // Use the same duration

    confettiInterval = setInterval(() => {
        if (Date.now() > endTime) {
            clearInterval(confettiInterval);
            confettiInterval = null;
            return;
        }

        // Fire a burst with rainbow colors, raining down
        confetti({
            particleCount: 50, // Number of particles per burst
            spread: 180,       // Spread wider to cover more screen width
            origin: { x: 0.5, y: 0 }, // Launch from top center
            angle: 270 + (Math.random() - 0.5) * 90, // Angle downward (225-315 degrees)
            // Use the same vibrant color palette
            colors: [
                '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#00FF7F', '#00FFFF', 
                '#007FFF', '#0000FF', '#7F00FF', '#FF00FF', '#FF007F', '#FF1493', 
                '#FF69B4', '#ADFF2F', '#FFA500', '#1E90FF' 
            ],
            shapes: ['circle', 'square'] // You can add 'star' here too if desired
        });
    }, interval);
}

function resetGame() {
    // Stop confetti if it's running
    if (confettiInterval) {
        // Use clearInterval for the setInterval approach
        clearInterval(confettiInterval);
        confettiInterval = null;
    }

    selectedRoom = null;
    selectedTime = null;
    timeRemaining = 0;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    diceRolling = false;
    diceSettling = false;
    settledDice = 0;
    timerPaused = false; 
    
    // --- Reset Room List --- 
    if (allRoomsListEl) {
        allRoomsListEl.querySelectorAll('.room-item').forEach(li => {
            li.classList.remove('crossed-out');
            li.classList.remove('active-room');
        });
    }
    // --- END RESET --- 

    // Reset button/display states
    timerDisplayEl.classList.add('inactive-timer'); 
    timerControlBtn.classList.remove('pulsing');
    rollRoomBtn.disabled = false; 
    rollRoomBtn.style.backgroundSize = '0% 100%'; 
    timerDisplayEl.style.backgroundSize = '0% 100%'; 

    // Reset glow variables
    rollRoomBtn.style.setProperty('--glow-blur', '0px');
    rollRoomBtn.style.setProperty('--glow-spread', '0px');
    rollRoomBtn.style.setProperty('--glow-alpha', 0);

    // Hide dice and reset positions
    diceObjects.forEach(d => {
         d.mesh.visible = false;
         resetDicePosition(d); // Put back in starting physics state
         d.body.sleep();
         
         // Reset any material highlights
         if (d.mesh && d.mesh.material && Array.isArray(d.mesh.material)) {
             for (let i = 0; i < d.mesh.material.length; i++) {
                 if (d.mesh.material[i].emissive) {
                     d.mesh.material[i].emissive.set(0x000000);
                 }
             }
         }
    });

    gameState = 'ROLL_DICE';
    updateUI();
}

// --- NEW: Reset All Rooms Function ---
function resetAllRooms() {
    // Confirm before resetting
    if (!confirm('Reset room list to default? This will remove any custom rooms you added.')) {
        return;
    }
    
    // Reset to initial rooms
    allRooms = [...initialRooms];
    excludedRooms.clear();
    
    // Update UI and dice
    populateAllRoomsList();
    initDice();
    updateURLFragment();
}

// --- Event Listeners ---
// REMOVE the old click listener
/*
rollRoomBtn.addEventListener('click', () => {
    if (!diceRolling) {
        rollBothDice();
    }
});
*/

// Add mousedown/touchstart listener
rollRoomBtn.addEventListener('mousedown', handleRollStart);
rollRoomBtn.addEventListener('touchstart', handleRollStart, { passive: true });

// Add mouseup/touchend listener
rollRoomBtn.addEventListener('mouseup', handleRollEnd);
rollRoomBtn.addEventListener('touchend', handleRollEnd);
// Add mouseleave listener to cancel roll if mouse leaves button while held
rollRoomBtn.addEventListener('mouseleave', handleRollCancel);

playAgainBtn.addEventListener('click', resetGame);

// --- Timer Control Button Listener ---
timerControlBtn.addEventListener('click', () => {
    if (gameState !== 'TIMER') return;

    if (!timerInterval) {
        // --- Start Timer --- 
        console.log("Starting timer...");
        startTimerInterval(); // This now handles class removal
        timerControlBtn.textContent = 'Pause';
    } else {
        // --- Pause / Resume --- 
        if (timerPaused) {
            // Resume
            console.log("Resuming timer...");
            timerPaused = false;
            timerControlBtn.textContent = 'Pause';
            timerDisplayEl.classList.remove('inactive-timer'); // Active now
            timerControlBtn.classList.remove('pulsing'); // Stop pulsing
        } else {
            // Pause
            console.log("Pausing timer...");
            timerPaused = true;
            timerControlBtn.textContent = 'Resume';
            timerDisplayEl.classList.add('inactive-timer'); // Inactive now
            timerControlBtn.classList.add('pulsing'); // Start pulsing
        }
    }
});

// Debug button listener
const debugSkipBtn = document.getElementById('debug-skip-timer-btn');
if (debugSkipBtn) {
    debugSkipBtn.addEventListener('click', () => {
        console.log("DEBUG: Skipping timer to COMPLETE state");
        if (timerInterval) clearInterval(timerInterval); // Stop any active timer
        timerInterval = null;
        timeRemaining = 0;
        
        // Assign placeholder values if none are set
        if (!selectedRoom) selectedRoom = "Debug Room";
        if (!selectedTime) selectedTime = 1; // Use 1 minute for the message
        
        gameState = 'COMPLETE';
        updateUI(); // This should trigger the celebration UI and effects
    });
}

// --- New Event Handlers for Hold-to-Roll ---
function handleRollStart(event) {
    if (diceRolling || gameState !== 'ROLL_DICE') return;
    if (event.type === 'touchstart') event.preventDefault();

    holdStartTime = Date.now();
    // Reset glow variables
    rollRoomBtn.style.setProperty('--glow-blur', '0px');
    rollRoomBtn.style.setProperty('--glow-spread', '0px');
    rollRoomBtn.style.setProperty('--glow-alpha', 0);
    
    rollRoomBtn.style.backgroundSize = '0% 100%'; // Reset fill on new hold

    if (holdInterval) clearInterval(holdInterval);
    holdInterval = setInterval(updateRollButtonPower, 50);
}

function updateRollButtonPower() {
    if (holdStartTime === 0) return; // Stop if not holding (e.g., after auto-release)
    
    const holdDuration = Date.now() - holdStartTime;
    const holdRatio = Math.min(holdDuration / maxHoldDuration, 1.0);
    rollRoomBtn.style.backgroundSize = `${holdRatio * 100}% 100%`;

    // Calculate glow based on ratio
    const maxBlur = 15; // Max blur radius in px
    const maxSpread = 5; // Max spread radius in px
    const maxAlpha = 0.7; // Max alpha value
    
    const glowBlur = holdRatio * maxBlur;
    const glowSpread = holdRatio * maxSpread;
    const glowAlpha = holdRatio * maxAlpha;
    
    // Update CSS custom properties for glow
    rollRoomBtn.style.setProperty('--glow-blur', `${glowBlur}px`);
    rollRoomBtn.style.setProperty('--glow-spread', `${glowSpread}px`);
    rollRoomBtn.style.setProperty('--glow-alpha', glowAlpha);

    // Check for full power auto-release
    if (holdRatio >= 1.0 && holdInterval) {
        console.log("Max power reached! Auto-releasing.");
        clearInterval(holdInterval);
        holdInterval = null; 
        handleRollEnd(null, true); 
    }
}

function handleRollEnd(event, isAutoRelease = false) {
    if (holdStartTime === 0 && !isAutoRelease) {
        return; 
    }
    
    if (holdInterval) {
        clearInterval(holdInterval);
        holdInterval = null;
    }

    if (event && event.type === 'touchend') event.preventDefault();

    let holdDuration;
    if (isAutoRelease) {
        console.log("Processing auto-release...");
        holdDuration = maxHoldDuration; 
        holdStartTime = 0; 
    } else {
        holdDuration = Date.now() - holdStartTime;
        holdStartTime = 0; 
    }

    // Reset glow variables
    rollRoomBtn.style.setProperty('--glow-blur', '0px');
    rollRoomBtn.style.setProperty('--glow-spread', '0px');
    rollRoomBtn.style.setProperty('--glow-alpha', 0);
    rollRoomBtn.style.backgroundSize = '0% 100%'; // Reset button fill visually
    
    const holdRatio = Math.min(holdDuration / maxHoldDuration, 1.0); 
    const calculatedForce = minForce + (maxForce - minForce) * holdRatio;
    const calculatedTorque = minTorque + (maxTorque - minTorque) * holdRatio;

    console.log(`Hold Duration: ${holdDuration}ms, Force: ${calculatedForce.toFixed(2)}, Torque: ${calculatedTorque.toFixed(2)}`);

    // --- Update Room List UI (Cross out non-selected) --- 
    if (allRoomsListEl) {
        const activeRooms = currentDiceRooms; // Use the updated global variable
        console.log('Active rooms for this roll (UI update):', activeRooms);
        
        // First, reset all crossed-out status and active status
        allRoomsListEl.querySelectorAll('.room-item').forEach(li => {
            li.classList.remove('crossed-out');
            li.classList.remove('active-room');
        });
        
        // Then update each room's status
        allRoomsListEl.querySelectorAll('.room-item').forEach(li => {
            const roomName = li.querySelector('.room-name').textContent;
            const isExcluded = li.querySelector('.room-name').classList.contains('excluded-room');
            
            // For non-excluded rooms:
            if (!isExcluded) {
                if (activeRooms.includes(roomName)) {
                    // Active room - highlight in yellow
                    li.classList.add('active-room');
                } else {
                    // Inactive room - cross out in gray
                    li.classList.add('crossed-out');
                }
            }
        });
    }
    // --- END UPDATE ROOM LIST --- 

    // --- Start Rolling Process ---
    rollRoomBtn.disabled = true; 
    diceRolling = true;
    diceSettling = false;
    settledDice = 0;

    diceObjects.forEach(d => {
        d.mesh.visible = true;
        resetDicePosition(d);
    });

    roomDice.body.position.x = -2;
    roomDice.mesh.position.copy(roomDice.body.position);
    timeDice.body.position.x = 2;
    timeDice.mesh.position.copy(timeDice.body.position);

    roomDice.body.wakeUp();
    timeDice.body.wakeUp();

    rollDice(roomDice, calculatedForce, calculatedTorque);
    setTimeout(() => rollDice(timeDice, calculatedForce, calculatedTorque), 150);
}

function handleRollCancel() {
    if (holdInterval) clearInterval(holdInterval);
    holdInterval = null;

    if (holdStartTime > 0) { 
        console.log("Roll cancelled (mouse left button)");
        holdStartTime = 0;
        // Reset glow variables
        rollRoomBtn.style.setProperty('--glow-blur', '0px');
        rollRoomBtn.style.setProperty('--glow-spread', '0px');
        rollRoomBtn.style.setProperty('--glow-alpha', 0);
        rollRoomBtn.style.backgroundSize = '0% 100%'; // Reset button fill
    }
}

// --- Animation Loop ---
const clock = new THREE.Clock();
let lastTime = 0;

function animate() {
    requestAnimationFrame(animate);

    const currentTime = clock.getElapsedTime();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Step the physics world with a fixed timestep
    world.step(1 / 60, deltaTime, 3); // Fixed timestep, delta time, max substeps

    // Update mesh positions based on physics bodies
    diceObjects.forEach(d => {
        if (d.mesh.visible) { // Only update visible dice
             d.mesh.position.copy(d.body.position);
             d.mesh.quaternion.copy(d.body.quaternion);
        }
    });

    controls.update(); // Update camera controls
    renderer.render(scene, camera);
}

// --- Resize Handling ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Initial Setup ---
updateUI(); // Set initial UI state
populateAllRoomsList(); // NEW: Populate the room list on load

// --- NEW: Add Event Listener for Room List Click --- 
if (allRoomsListEl) {
    allRoomsListEl.addEventListener('click', (event) => {
        // Handle delete button click
        if (event.target.classList.contains('delete-room-btn')) {
            const roomItem = event.target.closest('.room-item');
            const roomName = roomItem.querySelector('.room-name').textContent;
            // deleteRoom already calls updateURLFragment on success
            deleteRoom(roomName);
            return; 
        }
        
        // Handle room name click (toggling exclude/include)
        if (event.target.classList.contains('room-name')) {
            const roomName = event.target.textContent;
            console.log(`[RoomClick] Room "${roomName}" clicked for toggle`);
            
            // Track state BEFORE change
            const wasExcluded = excludedRooms.has(roomName);
            console.log(`[RoomClick] Room was ${wasExcluded ? 'excluded' : 'included'} before click`);
            
            let stateChanged = false;

            // Toggle exclusion state
            if (wasExcluded) {
                // Include a previously excluded room
                excludedRooms.delete(roomName);
                event.target.classList.remove('excluded-room');
                console.log(`[RoomClick] Room "${roomName}" is now INCLUDED`);
                stateChanged = true;
            } else {
                // Try to exclude this room
                const availableCount = allRooms.length - excludedRooms.size;
                
                if (availableCount <= 6) {
                    console.warn(`[RoomClick] Cannot exclude "${roomName}". Need at least 6 available rooms.`);
                    event.target.style.outline = '2px solid red';
                    setTimeout(() => { event.target.style.outline = 'none'; }, 300);
                    // No state change
                } else {
                    // Actually exclude the room
                    excludedRooms.add(roomName);
                    event.target.classList.add('excluded-room');
                    console.log(`[RoomClick] Room "${roomName}" is now EXCLUDED`);
                    stateChanged = true;
                }
            }
            
            console.log(`[RoomClick] State changed: ${stateChanged}, Current excluded set:`, 
                       Array.from(excludedRooms));
            
            // If the exclusion state was actually changed, update dice and URL
            if (stateChanged) {
                console.log('[RoomClick] Updating dice and URL fragment');
                initDice(); // Re-select rooms for the next roll
                updateURLFragment(); // Call the central function to update the URL
            }
        }
    });
}

// --- NEW: Add Event Listener for Add Room Form ---
const addRoomForm = document.getElementById('add-room-form');
const newRoomInput = document.getElementById('new-room-input');

if (addRoomForm) {
    addRoomForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const roomName = newRoomInput.value;
        if (addRoom(roomName)) {
            // Clear input on success
            newRoomInput.value = '';
        }
    });
}

// --- NEW: Add Event Listener for Reset Rooms Button ---
const resetRoomsBtn = document.getElementById('reset-rooms-btn');
if (resetRoomsBtn) {
    resetRoomsBtn.addEventListener('click', resetAllRooms);
}
// --------------------------------------------------

animate(); // Start the animation loop