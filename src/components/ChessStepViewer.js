import React, { useState } from 'react';
import { Chessboard } from "react-chessboard";
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ChessStepViewer({ steps }) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <BrowserOnly>
      {() => (
        <div style={{ maxWidth: 400, margin: '20px auto', textAlign: 'center' }}>
          <Chessboard
            id="kings-gambit-demo"
            position={steps[currentStep]}
            animationDuration={300}
            arePiecesDraggable={false}
          />

          <div style={{ marginTop: 12 }}>
            <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}>上一步</button>
            <button onClick={() => setCurrentStep(0)}>重設</button>
            <button onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))}>下一步</button>
          </div>

          <div>Step {currentStep}</div>
        </div>
      )}
    </BrowserOnly>
  );
}
