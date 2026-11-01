# Namma Space

**Namma Space** is a prototype for turning real-world spaces into interactive 3D environments that people can explore digitally.

The current prototype focuses on the browser-based 3D viewing and navigation experience. The longer-term goal is to build an automated capture-to-3D workflow that can reconstruct environments from photos, videos, and supported depth or sensor data.

> **Project status:** The interactive 3D viewer is the current prototype. Automated reconstruction, upload processing, and backend job orchestration are planned and are not yet integrated.

## Current prototype

- Loads a 3D environment from a GLB (`.glb`) model.
- Renders the environment in the browser using Three.js and React Three Fiber.
- Supports keyboard-based first-person movement (WASD).
- Supports camera rotation using the arrow keys.
- Supports click-to-move navigation.
- Includes basic collision handling to reduce movement through scene objects.

## Planned direction

1. **Capture:** User provides overlapping photos or a video of a real space. Supported depth/LiDAR data may be added where available.
2. **Pre-processing:** Extract useful video frames and check image quality and coverage.
3. **Camera estimation:** Estimate camera poses and scene structure using a photogrammetry / structure-from-motion pipeline.
4. **3D reconstruction:** Generate a photorealistic 3D representation, with Gaussian Splatting as a candidate representation.
5. **Navigation geometry:** Generate or obtain a separate mesh/depth/collision representation for movement and collision checks.
6. **Web viewing:** Load the reconstructed output into the browser-based viewer.

Gaussian Splats are primarily a photorealistic rendering representation. They do not automatically provide reliable, solid collision geometry, so navigation geometry may need to be generated separately.

## Technology

### Current viewer
- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
- GLTF/GLB assets

### Candidate reconstruction components (planned)
- FFmpeg for video frame extraction
- COLMAP or another camera-pose / structure-from-motion solution
- Nerfstudio / gsplat or another Gaussian Splatting training backend
- Spark or another compatible browser renderer for Gaussian Splat assets
- A backend service for upload handling and reconstruction job management

These reconstruction components are proposed directions, not claims that they are already integrated.

## Run locally

### Prerequisites
- Node.js and npm
- Git

### Setup

```bash
git clone https://github.com/ram-malhotra/namma-space.git
cd namma-space
npm install
npm run dev
```

Open the local URL printed by Vite in your browser (usually `http://localhost:5173`).

If the application is stored in a subfolder in the repository, change into that folder before running `npm install`.

## Project structure

The current application is a frontend prototype. The exact folder structure may evolve as the reconstruction backend is added.

A possible future structure is:

```text
namma-space/
├── frontend/          # React + Three.js viewer
├── backend/           # API and reconstruction job management
├── reconstruction/    # Frame extraction, camera estimation, 3D generation
├── docs/              # Architecture, screenshots and project notes
└── README.md
```

## Current limitations

- The viewer currently loads an existing GLB asset; it does not reconstruct a scene from uploaded media.
- Reconstruction quality, processing time, and supported capture devices have not yet been validated as part of an integrated pipeline.
- Collision behaviour depends on the geometry and scale of the loaded scene and requires testing with different environments.
- A Gaussian Splat renderer and a separate navigation/collision representation will be needed for the planned end-to-end experience.

## Roadmap

- [x] Build an interactive browser-based 3D viewer.
- [x] Add first-person keyboard navigation.
- [x] Add click-to-move navigation.
- [ ] Improve and validate collision handling across different scenes.
- [ ] Add photo/video upload interface.
- [ ] Build video frame extraction and capture-quality checks.
- [ ] Integrate camera-pose estimation / photogrammetry.
- [ ] Integrate Gaussian Splat reconstruction and export.
- [ ] Add a compatible Gaussian Splat viewer.
- [ ] Generate separate navigation/collision geometry.
- [ ] Connect the complete reconstruction workflow to the web viewer.

## Demo

Add screenshots or a short screen recording here once available.

Suggested files:

```text
docs/
└── screenshots/
    ├── viewer-overview.png
    └── navigation-demo.gif
```

## License

No license has been specified yet. Unless and until a license is added, all rights are reserved by the copyright holder. Check the licenses of any third-party models, textures, and datasets included in the repository before redistributing them.
