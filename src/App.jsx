import React, { useState, useRef } from 'react';
import ViewerScene from './components/ViewerScene';
import Controls from './components/Controls';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import './index.css';

function App() {
  const [textures, setTextures] = useState({
    map: null,
    normalMap: null,
    roughnessMap: null,
    metalnessMap: null,
    displacementMap: null,
  });

  const [geometry, setGeometry] = useState('Sphere');

  const [settings, setSettings] = useState({
    displacementScale: 0.02,
    normalScale: 1,
    roughness: 1, // Multiply factor
    metalness: 1, // Multiply factor
    envIntensity: 1,
    showEnvironment: false,
    envMap: null,
    envMapExt: null,
    ambientIntensity: 0.5,
    spotIntensity: 1,
    spotAngle: 0.2,
    spotPenumbra: 0.8,
    fresnelStrength: 0.5,
    fresnelPower: 3,
    lockCamera: false,
    doubleSided: false,
    modelRotation: { x: 0, y: 0, z: 0 },
    textureRepeat: { u: 1, v: 1 },
    autoRotate: false,
    autoRotateSpeed: 0.5, // radians per second
  });

  const rendererRef = useRef(null);

  const handleTextureChange = (key, url) => {
    setTextures(prev => ({
      ...prev,
      [key]: url
    }));
  };

  const handleDownload = async () => {
    const zip = new JSZip();
    const folder = zip.folder("pbr_material");

    let hasFiles = false;

    const fetchAndAddToZip = async (key, filename) => {
      const url = textures[key];
      if (url) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          folder.file(filename, blob);
          hasFiles = true;
        } catch (err) {
          console.error(`Failed to load ${key}`, err);
        }
      }
    };

    await Promise.all([
      fetchAndAddToZip('map', 'material_basecolor.png'),
      fetchAndAddToZip('normalMap', 'material_normal.png'),
      fetchAndAddToZip('roughnessMap', 'material_roughness.png'),
      fetchAndAddToZip('metalnessMap', 'material_metalness.png'),
      fetchAndAddToZip('displacementMap', 'material_height.png'),
    ]);

    if (hasFiles) {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "pbr_material.zip");
    } else {
      alert("No textures loaded to download.");
    }
  };

  const downloadFromRenderer = (gl, filename, scale = 1) => {
    if (!gl) return;
    const canvas = gl.domElement;
    const { clientWidth, clientHeight } = canvas;
    const prevSize = { width: canvas.width, height: canvas.height };
    const prevPixelRatio = gl.getPixelRatio ? gl.getPixelRatio() : 1;

    const targetW = clientWidth * scale;
    const targetH = clientHeight * scale;
    if (gl.setPixelRatio) gl.setPixelRatio(scale);
    if (gl.setSize) gl.setSize(clientWidth, clientHeight, false);

    requestAnimationFrame(() => {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = filename;
      link.click();

      if (gl.setPixelRatio) gl.setPixelRatio(prevPixelRatio);
      if (gl.setSize) gl.setSize(prevSize.width / prevPixelRatio, prevSize.height / prevPixelRatio, false);
    });
  };

  const handleDownloadRenderPng = () => {
    downloadFromRenderer(rendererRef.current, 'pbr_viewport.png', 1);
  };

  const handleDownloadFullPng = () => {
    // Higher scale for sharper export, still UI-free (canvas only)
    downloadFromRenderer(rendererRef.current, 'pbr_full.png', 2);
  };

  return (
    <div className="flex w-full h-full bg-[#121212] text-white overflow-hidden">
      {/* 3D Viewport - Flex grow to take available space */}
      <div className="flex-1 h-full relative">
        <ViewerScene
          textures={textures}
          geometryType={geometry}
          envPreset="city"
          settings={settings}
          onCanvasReady={(gl) => {
            rendererRef.current = gl;
          }}
        />

        {/* Overlay info */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="flex gap-2">
            <span className="px-2 py-1 rounded bg-black/40 backdrop-blur text-xs font-mono text-white/50 border border-white/5">
              {geometry}
            </span>
            <span className="px-2 py-1 rounded bg-black/40 backdrop-blur text-xs font-mono text-white/50 border border-white/5">
              Env: City
            </span>
          </div>
        </div>
      </div>

      {/* Sidebar Controls */}
      <Controls
        textures={textures}
        onTextureChange={handleTextureChange}
        geometry={geometry}
        onGeometryChange={setGeometry}
        settings={settings}
        onSettingsChange={setSettings}
        onDownload={handleDownload}
        onDownloadRender={handleDownloadRenderPng}
        onDownloadFull={handleDownloadFullPng}
      />
    </div>
  );
}

export default App;
