import React, { useState, useRef, useEffect, useCallback } from 'react';
import ViewerScene from './components/ViewerScene';
import Controls from './components/Controls';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import './index.css';

// Defaults tuned so the viewer shows recognizable PBR shading on first load:
// medium metalness + medium-low roughness produces visible specular + reflections
// against the default `city` environment preset.
const DEFAULT_SETTINGS = {
  displacementScale: 0.02,
  normalScale: 1,
  roughness: 0.35,
  metalness: 0.6,
  materialColor: '#cccccc',
  envIntensity: 0.8,
  showEnvironment: false,
  envMap: null,
  envMapExt: null,
  backgroundImage: null,
  backgroundColor: '#1a1a1a',
  backgroundType: 'none',
  backgroundImageMode: 'cover',
  backgroundOverlayMode: 'none',
  backgroundOverlayOpacity: 0.45,
  backgroundOverlayColor: '#000000',
  backgroundOverlayGradient: 'bottom',
  backgroundOverlaySoftness: 0.55,
  ambientIntensity: 0.15,
  spotIntensity: 1.2,
  spotAngle: 0.35,
  spotPenumbra: 0.6,
  fresnelStrength: 0.3,
  fresnelPower: 3,
  lockCamera: false,
  doubleSided: false,
  showShadows: false,
  modelRotation: { x: 0, y: 0, z: 0 },
  modelScale: 1.0,
  textureRepeat: { u: 1, v: 1, uniform: 1, linked: true },
  autoRotate: false,
  autoRotateSpeed: 0,
};

const SETTINGS_STORAGE_KEY = 'pbr-viewer:settings:v1';

// Only persist settings that are safe across sessions. We deliberately drop
// blob:// URLs (envMap, backgroundImage) because they don't survive a reload.
const PERSISTED_KEYS = [
  'displacementScale', 'normalScale', 'roughness', 'metalness', 'materialColor',
  'envIntensity', 'showEnvironment', 'backgroundColor', 'backgroundType',
  'backgroundImageMode', 'backgroundOverlayMode', 'backgroundOverlayOpacity',
  'backgroundOverlayColor', 'backgroundOverlayGradient', 'backgroundOverlaySoftness',
  'ambientIntensity', 'spotIntensity', 'spotAngle', 'spotPenumbra',
  'fresnelStrength', 'fresnelPower', 'lockCamera', 'doubleSided', 'showShadows',
  'modelRotation', 'modelScale', 'textureRepeat', 'autoRotate', 'autoRotateSpeed',
];

const loadSavedSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return null;
  }
};

const saveSettings = (settings) => {
  try {
    const subset = {};
    for (const key of PERSISTED_KEYS) {
      if (settings[key] !== undefined) subset[key] = settings[key];
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(subset));
  } catch {
    // localStorage quota / disabled — silently ignore, this is a nice-to-have.
  }
};

function App() {
  const [textures, setTextures] = useState({
    map: null,
    normalMap: null,
    roughnessMap: null,
    metalnessMap: null,
    displacementMap: null,
  });

  const [geometry, setGeometry] = useState('Sphere');

  // Custom model state
  const [customModel, setCustomModel] = useState({
    data: null,     // The loaded 3D object
    file: null,     // File info
    type: null,     // 'obj', 'gltf', 'fbx', etc.
  });

  // Render mode: 'pbr', 'normal', 'wireframe'
  const [renderMode, setRenderMode] = useState('pbr');

  // Dual view mode
  const [dualViewMode, setDualViewMode] = useState(false);
  const [secondRenderMode, setSecondRenderMode] = useState('normal'); // Second view render mode

  // Video recording state
  const [aspectRatio, setAspectRatio] = useState('free'); // 'free', '1:1', '16:9', '4:3', '9:16', '21:9'
  const [recording, setRecording] = useState({
    isRecording: false,
    duration: 0,
    transparentBg: false,
    frameRate: 60,
    quality: 'high',
    format: 'webm', // 'webm' or 'mp4'
    resolution: 'viewport', // 'viewport', '1920x1080', '1280x720', '3840x2160'
  });
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const canvasStreamRef = useRef(null);
  const rendererRef = useRef(null);
  const secondRendererRef = useRef(null);
  // Shared camera state for dual-view sync; CameraSync fills in position/quaternion lazily.
  const cameraStateRef = useRef({ position: null, quaternion: null });
  const recordingAnimationRef = useRef(null); // Store animation frame ID for recording

  // Transient error toast — shown for ~4s when a model/texture load fails.
  const [errorMessage, setErrorMessage] = useState(null);
  const errorTimerRef = useRef(null);
  const showError = useCallback((msg) => {
    setErrorMessage(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setErrorMessage(null), 4000);
  }, []);
  useEffect(() => () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); }, []);

  const [settings, setSettings] = useState(() => loadSavedSettings() || DEFAULT_SETTINGS);

  const handleTextureChange = (key, url) => {
    setTextures(prev => ({
      ...prev,
      [key]: url
    }));
  };

  const handleModelUpload = useCallback((modelData, fileInfo) => {
    setCustomModel({
      data: modelData,
      file: fileInfo,
      type: fileInfo?.type ?? null,
    });
    if (fileInfo) setGeometry('Custom');
  }, []);

  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try { localStorage.removeItem(SETTINGS_STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  // Persist settings (throttled via rAF so dragging sliders doesn't write every tick).
  useEffect(() => {
    const id = requestAnimationFrame(() => saveSettings(settings));
    return () => cancelAnimationFrame(id);
  }, [settings]);

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
    const prevSize = { width: canvas.width, height: canvas.height };
    const prevPixelRatio = gl.getPixelRatio ? gl.getPixelRatio() : 1;

    if (gl.setPixelRatio) gl.setPixelRatio(scale);
    if (gl.setSize) gl.setSize(canvas.clientWidth, canvas.clientHeight, false);

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

  // Video recording functions
  const startRecording = () => {
    if (!rendererRef.current) {
      alert('Canvas not ready');
      return;
    }

    // Get resolution settings
    const resolutionMap = {
      'viewport': null, // Use current viewport size
      '1920x1080': { width: 1920, height: 1080 },
      '1280x720': { width: 1280, height: 720 },
      '3840x2160': { width: 3840, height: 2160 },
    };

    const canvas1 = rendererRef.current.domElement;
    const canvas2 = dualViewMode && secondRendererRef.current ? secondRendererRef.current.domElement : null;

    // Create offscreen canvas for recording
    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d');

    // Determine final recording size
    if (recording.resolution === 'viewport') {
      if (dualViewMode && canvas2) {
        offscreenCanvas.width = canvas1.width + canvas2.width;
        offscreenCanvas.height = Math.max(canvas1.height, canvas2.height);
      } else {
        offscreenCanvas.width = canvas1.width;
        offscreenCanvas.height = canvas1.height;
      }
    } else {
      const res = resolutionMap[recording.resolution];
      if (res) {
        offscreenCanvas.width = res.width;
        offscreenCanvas.height = res.height;
      }
    }

    // Animation loop to draw canvases to offscreen canvas
    let isRecording = true;
    const drawFrame = () => {
      if (!isRecording) return;

      ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

      if (dualViewMode && canvas2) {
        // Dual view: draw both canvases side by side
        const halfWidth = offscreenCanvas.width / 2;
        ctx.drawImage(canvas1, 0, 0, halfWidth, offscreenCanvas.height);
        ctx.drawImage(canvas2, halfWidth, 0, halfWidth, offscreenCanvas.height);
      } else {
        // Single view: draw one canvas scaled to target size
        ctx.drawImage(canvas1, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
      }

      recordingAnimationRef.current = requestAnimationFrame(drawFrame);
    };

    // Start drawing frames
    drawFrame();

    // Get stream from offscreen canvas
    const fps = recording.frameRate;
    const stream = offscreenCanvas.captureStream(fps);
    canvasStreamRef.current = stream;

    // Configure MediaRecorder based on format and transparency
    let mimeType;
    let fileExtension;

    if (recording.format === 'mp4') {
      // MP4 format (no transparency support)
      mimeType = 'video/mp4';
      fileExtension = 'mp4';

      // Try different MP4 codecs
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
        mimeType = 'video/mp4;codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
      } else if (!MediaRecorder.isTypeSupported('video/mp4')) {
        alert('Your browser does not support MP4 recording. Try WebM format instead.');
        return;
      }
    } else {
      // WebM format (supports transparency with VP9)
      fileExtension = 'webm';
      if (recording.transparentBg) {
        mimeType = 'video/webm;codecs=vp9';
      } else {
        mimeType = 'video/webm;codecs=vp8';
      }

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        alert('Your browser does not support the required WebM codec');
        return;
      }
    }

    const options = {
      mimeType,
      videoBitsPerSecond: recording.quality === 'high' ? 8000000 : recording.quality === 'medium' ? 4000000 : 2000000,
    };

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    // Store fileExtension in closure for onstop callback
    const extension = fileExtension;

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pbr_recording_${Date.now()}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);

      // Reset
      recordedChunksRef.current = [];
      setRecording(prev => ({ ...prev, isRecording: false, duration: 0 }));
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };

    mediaRecorder.start(100); // Collect data every 100ms

    // Start timer
    setRecording(prev => ({ ...prev, isRecording: true, duration: 0 }));
    recordingTimerRef.current = setInterval(() => {
      setRecording(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordingAnimationRef.current) {
      cancelAnimationFrame(recordingAnimationRef.current);
      recordingAnimationRef.current = null;
    }
  };

  const updateRecordingSetting = (key, value) => {
    setRecording(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex w-full h-full bg-[#121212] text-white overflow-hidden">
      {/* 3D Viewport - Flex grow to take available space */}
      <div className="flex-1 min-w-0 h-full relative">
        {dualViewMode ? (
          // Dual view layout
          <div className="flex w-full h-full">
            <div className="flex-1 h-full">
              <ViewerScene
                textures={textures}
                geometryType={geometry}
                customModel={customModel}
                renderMode={renderMode}
                envPreset="city"
                settings={settings}
                aspectRatio={aspectRatio}
                transparentBg={recording.transparentBg}
                isPrimaryView={true}
                cameraStateRef={cameraStateRef}
                onCanvasReady={(gl) => {
                  rendererRef.current = gl;
                }}
                onError={showError}
              />
            </div>
            <div className="flex-1 h-full">
              <ViewerScene
                textures={textures}
                geometryType={geometry}
                customModel={customModel}
                renderMode={secondRenderMode}
                envPreset="city"
                settings={settings}
                aspectRatio={aspectRatio}
                transparentBg={recording.transparentBg}
                isPrimaryView={false}
                cameraStateRef={cameraStateRef}
                syncCamera={true}
                onCanvasReady={(gl) => {
                  secondRendererRef.current = gl;
                }}
              />
            </div>
          </div>
        ) : (
          // Single view layout
          <ViewerScene
            textures={textures}
            geometryType={geometry}
            customModel={customModel}
            renderMode={renderMode}
            envPreset="city"
            settings={settings}
            aspectRatio={aspectRatio}
            transparentBg={recording.transparentBg}
            onCanvasReady={(gl) => {
              rendererRef.current = gl;
            }}
            onError={showError}
          />
        )}

        {errorMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-red-600/90 border border-red-400/50 text-white text-sm rounded-lg shadow-lg backdrop-blur-sm">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Sidebar Controls */}
      <Controls
        textures={textures}
        onTextureChange={handleTextureChange}
        geometry={geometry}
        onGeometryChange={setGeometry}
        customModel={customModel}
        onModelUpload={handleModelUpload}
        renderMode={renderMode}
        onRenderModeChange={setRenderMode}
        settings={settings}
        onSettingsChange={setSettings}
        onDownload={handleDownload}
        onDownloadRender={handleDownloadRenderPng}
        onDownloadFull={handleDownloadFullPng}
        onResetSettings={handleResetSettings}
        // Video recording props
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        recording={recording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onUpdateRecording={updateRecordingSetting}
        // Dual view props
        dualViewMode={dualViewMode}
        onDualViewModeChange={setDualViewMode}
        secondRenderMode={secondRenderMode}
        onSecondRenderModeChange={setSecondRenderMode}
      />
    </div>
  );
}

export default App;
