# PBR Viewer

A PBR (Physically Based Rendering) material preview tool built with React and Three.js. Real-time preview and debugging of PBR material textures with support for multiple geometries, environmental lighting, and material parameter adjustments.

## Features

### 🎨 Material Texture Support
- **Base Color / Albedo** - Base color texture
- **Normal Map** - Normal mapping texture
- **Roughness** - Roughness texture
- **Metalness** - Metalness texture
- **Height / Displacement** - Height/displacement texture

### 📦 Geometry Types
- Sphere
- Cube
- Plane
- Cylinder

### 🌟 Lighting & Environment
- **HDRI Environment Maps** - Support for `.hdr` and `.exr` formats
- **Ambient Light Intensity** - Adjustable ambient lighting intensity
- **Spotlight Controls** - Adjustable intensity, angle, and edge softness
- **Environment Intensity** - Overall lighting intensity control

### ⚙️ Material Parameters
- **Displacement Scale** - Displacement texture intensity (0-0.3)
- **Normal Intensity** - Normal map intensity (0-3)
- **Roughness Factor** - Roughness multiplier (0-1)
- **Metalness Factor** - Metalness multiplier (0-1)
- **Fresnel Strength** - Fresnel reflection strength (0-2)
- **Fresnel Power** - Fresnel reflection falloff (1-6)
- **Texture Scale** - Texture scaling control

### 🎯 View Controls
- **Model Rotation** - Manual X/Y/Z axis rotation angles
- **Auto Rotate** - Constant speed auto-rotation with adjustable speed
- **Camera Lock** - Lock camera to rotate only the model
- **Double-Sided Rendering** - Support for displaying model backfaces

### 💾 Export Features
- **Download Render PNG** - Export current viewport render
- **Download Full PNG** - Export high-resolution render
- **Download Material Pack** - Package all loaded textures as ZIP file

## Tech Stack

- **React 19** - UI framework
- **Three.js** - 3D rendering engine
- **@react-three/fiber** - React Three.js renderer
- **@react-three/drei** - Three.js utility components
- **Vite** - Build tool
- **Tailwind CSS** - Styling framework
- **Lucide React** - Icon library

## Installation & Usage

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

Visit `http://localhost:5173` to view the application.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## How to Use

1. **Upload Textures** - Click on texture slots to upload corresponding PBR textures
2. **Select Geometry** - Choose the geometry type to preview at the top
3. **Adjust Material Parameters** - Use sliders to adjust various material parameters
4. **Configure Lighting** - Adjust ambient and spotlight settings, or upload custom HDRI
5. **Control View** - Use mouse drag to rotate camera, or lock camera and rotate model
6. **Export Results** - Use download buttons to export renders or material packs

## Project Structure

```
pbr_viewer/
├── src/
│   ├── components/
│   │   ├── Controls.jsx      # Control panel component
│   │   └── ViewerScene.jsx   # 3D scene component
│   ├── App.jsx               # Main application component
│   ├── main.jsx              # Entry point
│   └── index.css             # Global styles
├── public/                   # Static assets
└── package.json             # Project configuration
```

## Development

The project uses ESLint for code linting:

```bash
npm run lint
```

## License

MIT
