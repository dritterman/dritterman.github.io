# Chore Dice Roller 3D

This project is an interactive 3D web application designed to make assigning household chores more fun and random. It uses a virtual dice roll to determine both the room to be cleaned and the duration for the task.

## Features

*   **3D Environment**: Utilizes Three.js to create a visually engaging 3D scene featuring:
    *   A dynamic skybox transitioning from orange/pink at the top to indigo/purple at the bottom.
    *   A gray checkerboard patterned floor.
    *   A transparent, light-blue bounding box that contains the dice.
*   **Physics Simulation**: Incorporates Cannon.js for realistic dice physics, including gravity, collisions, bouncing, and settling within the bounding box and walls.
*   **Dual Dice Roll**: Rolls two distinct six-sided dice simultaneously:
    *   **Room Dice**: Displays the names of household rooms on its faces. Each face has a unique background color (white, yellow, green, red, orange, blue) with black text, automatically wrapped for readability.
    *   **Time Dice**: Shows time durations (in minutes) on its faces, using the same face color scheme but with larger, bold numbers.
*   **Dynamic Room Selection**:
    *   Starts with a predefined list of possible rooms.
    *   Randomly selects 6 rooms from the available pool for each rolling session.
    *   If fewer than 6 rooms are available after exclusions, "Empty" placeholders are used on the dice faces.
*   **Interactive Room Exclusion**:
    *   Displays a list of all possible rooms in a side panel.
    *   Allows users to click on room names in the list to exclude them from future rolls.
    *   Excluded rooms are visually marked (grayed out, italicized, line-through).
    *   Users can click an excluded room again to re-include it.
    *   Prevents exclusion if it would result in fewer than 6 available rooms, providing brief visual feedback (red outline) if the action is disallowed.
*   **"Hold & Release" Roll Mechanic**:
    *   Users click and hold the main "Roll Dice" button (blue base color) to build up power.
    *   A visual indicator (yellow) fills the button from left to right.
    *   A subtle yellow glow effect intensifies around the button as power increases.
    *   Releasing the button (or holding it until maximum power triggers an auto-release) launches the dice with force and torque proportional to the hold duration.
*   **Clear Results**: Once the dice settle, the application determines the upward-facing side of each die and displays the selected room and time. The top face of the settled dice is visually highlighted with a subtle emissive glow.
*   **Integrated Timer**:
    *   After the dice roll determines the chore, a timer display becomes available, set to the selected duration.
    *   The timer display shows remaining time (MM:SS) and features a yellow progress bar that fills up based on elapsed time.
    *   Users must manually click the "Start Timer" button (which pulses initially).
    *   Provides "Pause" and "Resume" functionality. The button text updates accordingly, and it pulses when paused to indicate it requires action. The timer text turns red when paused or inactive.
*   **Completion Celebration**: When the timer reaches zero, a fun, multi-colored confetti burst animation plays continuously for a short duration, accompanied by an applause sound effect.
*   **Responsive UI**: The main UI panel and the room list panel adjust reasonably well to different screen sizes.
*   **Camera Controls**: Uses Three.js OrbitControls, allowing users to rotate the camera around the scene, zoom in/out, and pan (within limits).
*   **Debug Mode**: Includes an optional button (visible by default) to skip the timer phase and jump directly to the completion state for testing purposes.

## How to Use

1.  **Open the `index.html` file in your web browser.** Most modern browsers should run the application directly from the file system.
2.  **(Optional) Manage Rooms**: Look at the "All Possible Rooms" panel on the right.
    *   Click any room name to exclude it from being selected by the dice. It will turn gray, italicized, and get a line through it.
    *   Click an excluded room again to re-include it.
    *   You must leave at least 6 rooms available for selection. The application will prevent you from excluding more if the limit is reached.
3.  **Roll the Dice**:
    *   Click and hold the "Roll Dice" button in the main UI panel.
    *   Watch the button fill up with yellow and glow. The longer you hold (up to about 1.5 seconds), the more force is applied.
    *   Release the button (or let it auto-release at full power) to throw the dice into the 3D box.
    *   The dice will bounce realistically off the floor, walls, and each other.
4.  **View Results**:
    *   Wait for both dice to come to a complete stop.
    *   The application will highlight the top face of each die.
    *   The selected room and time duration will be displayed (e.g., "Kitchen for 15 minutes").
    *   The "Roll Dice" button will be disabled.
5.  **Start the Timer**:
    *   The timer display will show the selected time (e.g., "15:00") in red text.
    *   Click the pulsing "Start Timer" button. The text will turn black, and the timer will begin counting down. The progress bar will start filling.
6.  **Manage the Timer (Optional)**:
    *   Click "Pause" to temporarily stop the timer. The button text changes to "Resume", it will pulse, and the timer text turns red.
    *   Click "Resume" to continue the countdown. The pulsing stops, and the timer text turns black again.
7.  **Complete the Chore**: Once the timer runs out:
    *   A "Chore Complete!" message appears.
    *   Confetti animation and sound will play for a while.
8.  **Play Again**: Click the "Play Again" button to reset the application (hide dice, reset timer, enable roll button) and roll for a new chore. Room exclusions are persistent between rounds.

## Technical Details

*   **Frontend**: HTML, CSS, JavaScript (ES6+)
*   **3D Graphics**: [Three.js](https://threejs.org/) (using `WebGLRenderer`, `PerspectiveCamera`, `Scene`, `Mesh`, `BoxGeometry`, `PlaneGeometry`, `ShaderMaterial` for skybox, `MeshStandardMaterial`, `CanvasTexture`)
*   **Physics Engine**: [Cannon.js](http://schteppe.github.io/cannon.js/) (using `World`, `Body`, `Box`, `Plane`, `Material`, `ContactMaterial`, `Vec3`, `Quaternion`)
*   **Camera Controls**: Three.js `OrbitControls`
*   **Effects**: [canvas-confetti](https://github.com/catdad/canvas-confetti) for the celebration effect.
*   **Dice Face Generation**: Text and background colors for dice faces are rendered dynamically onto HTML5 Canvas elements within the JavaScript, which are then used as `CanvasTexture` map inputs for the `MeshStandardMaterial` on each face of the dice geometry.

## Running Locally

This application is designed to be run directly from the filesystem without needing a local server or Node.js build process.

1.  Download or clone the project files (`index.html`, `style.css`, `script.js`).
2.  Ensure all files are in the same directory.
3.  **Open the `index.html` file in a modern web browser** (like Chrome, Firefox, Edge, Safari).

**Potential Issue:** While unlikely with the current setup (as assets like sounds are loaded from external URLs and textures are generated in code), some browsers have strict security policies (CORS) that *could* theoretically interfere with loading local assets if the project were modified to use local sound files or image textures. If you encounter issues where the 3D scene doesn't load correctly when opening the file directly, you might need to use a simple local server. Many code editors (like VS Code with the "Live Server" extension) or simple command-line tools (like Python's `http.server` module: `python -m http.server`) can serve the files locally, bypassing potential filesystem restrictions. However, **try opening `index.html` directly first.** 