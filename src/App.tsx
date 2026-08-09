import { Canvas } from '@react-three/fiber';
import { Scene } from './Scene';
import './App.css';

function App() {
  return (
    <div id="canvas-root">
      <Canvas
        // Caps device-pixel-ratio at 2 -- rendering at a 3x/4x DPR on a phone
        // costs real FPS for a sharpness difference nobody notices.
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [3, 3, 3], fov: 50 }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}

export default App;
