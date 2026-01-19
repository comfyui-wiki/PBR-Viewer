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

  // Custom model state
  const [customModel, setCustomModel] = useState({
    data: null,     // The loaded 3D object
    file: null,     // File info
    type: null,     // 'obj', 'gltf', 'fbx', etc.
  });

  // Render mode: 'pbr', 'normal', 'wireframe'
  const [renderMode, setRenderMode] = useState('pbr');

  // Video recording state
  const [aspectRatio, setAspectRatio] = useState('free'); // 'free', '1:1', '16:9', '4:3', '9:16', '21:9'
  const [recording, setRecording] = useState({
    isRecording: false,
    isPaused: false,
    duration: 0,
    transparentBg: false,
    frameRate: 60,
    quality: 'high',
  });
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const canvasStreamRef = useRef(null);

  const [settings, setSettings] = useState({
    displacementScale: 0.02,
    normalScale: 1,
    roughness: 1, // Multiply factor
    metalness: 1, // Multiply factor
    envIntensity: 1,
    showEnvironment: false,
    envMap: null,
    envMapExt: null,
    backgroundImage: null, // Simple PNG/JPG background
    showBackground: false, // Show simple background
    backgroundImageMode: 'cover', // 'stretch', 'cover', 'contain'
    ambientIntensity: 0.5,
    spotIntensity: 1,
    spotAngle: 0.2,
    spotPenumbra: 0.8,
    fresnelStrength: 0.5,
    fresnelPower: 3,
    lockCamera: false,
    doubleSided: false,
    modelRotation: { x: 0, y: 0, z: 0 },
    textureRepeat: { u: 1, v: 1, uniform: 1, linked: true },
    autoRotate: false,
    autoRotateSpeed: 0, // radians per second (negative = counterclockwise, positive = clockwise)
  });

  const rendererRef = useRef(null);

  const handleTextureChange = (key, url) => {
    setTextures(prev => ({
      ...prev,
      [key]: url
    }));
  };

  const handleModelUpload = (modelData, fileInfo) => {
    setCustomModel({
      data: modelData,
      file: fileInfo,
      type: fileInfo.type,
    });
    // Switch to custom geometry when model is uploaded
    setGeometry('Custom');
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

  // Video recording functions
  const startRecording = () => {
    if (!rendererRef.current) {
      alert('Canvas not ready');
      return;
    }

    const canvas = rendererRef.current.domElement;

    // Get canvas stream
    const fps = recording.frameRate;
    const stream = canvas.captureStream(fps);
    canvasStreamRef.current = stream;

    // Configure MediaRecorder
    const mimeType = recording.transparentBg
      ? 'video/webm;codecs=vp9'
      : 'video/webm;codecs=vp8';

    // Check if mimeType is supported
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      alert('Your browser does not support the required video format');
      return;
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

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pbr_recording_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);

      // Reset
      recordedChunksRef.current = [];
      setRecording(prev => ({ ...prev, isRecording: false, isPaused: false, duration: 0 }));
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
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecording(prev => ({ ...prev, isPaused: true }));
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecording(prev => ({ ...prev, isPaused: false }));
      recordingTimerRef.current = setInterval(() => {
        setRecording(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    }
  };

  const updateRecordingSetting = (key, value) => {
    setRecording(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex w-full h-full bg-[#121212] text-white overflow-hidden">
      {/* 3D Viewport - Flex grow to take available space */}
      <div className="flex-1 h-full relative">
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
        />
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
        // Video recording props
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        recording={recording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onPauseRecording={pauseRecording}
        onResumeRecording={resumeRecording}
        onUpdateRecording={updateRecordingSetting}
      />
    </div>
  );
}

export default App;
