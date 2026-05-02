
import * as THREE from 'three';
import { FANTASY_SYMBOLS, FANTASY_COLORS, RACE_ICONS } from '../types';

const CANVAS_SIZE = 1024; // Increased resolution for sharpness

// Helper to create a base canvas
const createCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  return { canvas, ctx: canvas.getContext('2d')! };
};

// 1. Numeric Dice (Solid Bone/Resin look)
export const generateNumericMaterials = (): THREE.MeshStandardMaterial[] => {
  const materials: THREE.MeshStandardMaterial[] = [];
  const faceOrder = [3, 4, 1, 6, 2, 5]; 

  for (let i = 0; i < 6; i++) {
    const { canvas, ctx } = createCanvas();
    
    // Background: Solid Warm White (Ivory)
    ctx.fillStyle = '#f8f5f2'; 
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Border: Stronger Grey
    ctx.strokeStyle = '#94a3b8'; 
    ctx.lineWidth = 60; // Thicker border
    ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Inner Border
    ctx.strokeStyle = '#e2e8f0'; 
    ctx.lineWidth = 10;
    ctx.strokeRect(40, 40, CANVAS_SIZE-80, CANVAS_SIZE-80);

    // Pips: Dark Ink
    ctx.fillStyle = '#1e293b';
    ctx.shadowColor = "rgba(0,0,0,0.2)"; 
    ctx.shadowBlur = 5; 
    ctx.shadowOffsetX = 3; 
    ctx.shadowOffsetY = 3;
    
    const value = faceOrder[i];
    const pips = getPipPositions(value, CANVAS_SIZE/2, CANVAS_SIZE/4);
    
    pips.forEach(p => { 
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, 90, 0, Math.PI*2); // Larger pips
        ctx.fill(); 
    });

    const texture = new THREE.CanvasTexture(canvas); 
    texture.colorSpace = THREE.SRGBColorSpace; // Ensure correct color space
    texture.anisotropy = 16; // Max anisotropy

    materials.push(new THREE.MeshStandardMaterial({ 
        map: texture, 
        color: 0xffffff, 
        roughness: 0.2, // Smooth but not glass
        metalness: 0.0,
    }));
  }
  return materials;
};

// 2. Race Dice
export const generateRaceMaterials = (): THREE.MeshStandardMaterial[] => {
  const materials: THREE.MeshStandardMaterial[] = [];
  const faceIndices = [2, 3, 0, 5, 1, 4]; 

  for (let i = 0; i < 6; i++) {
    const { canvas, ctx } = createCanvas();
    const iconData = RACE_ICONS[faceIndices[i]];

    // Background
    ctx.fillStyle = '#f8f5f2'; 
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Border (Race Color)
    ctx.strokeStyle = iconData.bgColor; 
    ctx.lineWidth = 60; 
    ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); 
    
    // Inner Border
    ctx.lineWidth = 10; 
    ctx.strokeRect(40, 40, CANVAS_SIZE-80, CANVAS_SIZE-80);

    // Icon
    ctx.shadowColor = "rgba(0,0,0,0.2)"; 
    ctx.shadowBlur = 5;
    ctx.font = '400px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; 
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    ctx.fillStyle = iconData.bgColor; 
    ctx.fillText(iconData.char, CANVAS_SIZE/2, CANVAS_SIZE/2 + 30); 

    // Text Name
    ctx.font = 'bold 100px system-ui, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(iconData.name, CANVAS_SIZE/2, CANVAS_SIZE/2 + 280);

    const texture = new THREE.CanvasTexture(canvas); 
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    
    materials.push(new THREE.MeshStandardMaterial({ 
        map: texture, 
        color: 0xffffff, 
        roughness: 0.2, 
        metalness: 0.0
    }));
  }
  return materials;
};

// 3. Fantasy Attribute Dice
export const generateFantasyMaterialSets = (): THREE.MeshStandardMaterial[][] => {
  const sets: THREE.MeshStandardMaterial[][] = [];
  const faceIndices = [2, 3, 0, 5, 1, 4]; 

  for (let dieIndex = 0; dieIndex < 6; dieIndex++) {
      const dieMaterials: THREE.MeshStandardMaterial[] = [];
      for (let i = 0; i < 6; i++) {
          const { canvas, ctx } = createCanvas();
          
          const logicalFace = faceIndices[i]; 
          const symbolData = FANTASY_SYMBOLS[logicalFace];
          const colorIndex = logicalFace;
          const bgColor = FANTASY_COLORS[colorIndex];

          // Solid Background for solidity
          ctx.fillStyle = bgColor; 
          ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

          // Subtle noise texture for material realism
          addNoise(ctx, CANVAS_SIZE);

          // Gold Border
          ctx.strokeStyle = '#fbbf24'; 
          ctx.lineWidth = 50; 
          ctx.strokeRect(25, 25, CANVAS_SIZE-50, CANVAS_SIZE-50);
          
          // Inner White Line
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; 
          ctx.lineWidth = 10; 
          ctx.strokeRect(60, 60, CANVAS_SIZE-120, CANVAS_SIZE-120);

          // Symbol
          ctx.shadowColor = "rgba(0,0,0,0.4)"; 
          ctx.shadowBlur = 15; 
          ctx.shadowOffsetX = 5; 
          ctx.shadowOffsetY = 5;
          ctx.font = '400px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; 
          ctx.textAlign = 'center'; 
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff'; 
          ctx.fillText(symbolData.char, CANVAS_SIZE/2, CANVAS_SIZE/2 + 40); 

          const texture = new THREE.CanvasTexture(canvas); 
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 16;

          dieMaterials.push(new THREE.MeshStandardMaterial({ 
              map: texture, 
              color: 0xffffff, 
              roughness: 0.3, // Slightly rougher for painted wood/stone feel
              metalness: 0.0,
          }));
      }
      sets.push(dieMaterials);
  }
  return sets;
};

// Helper for pips
function getPipPositions(value: number, c: number, o: number) {
  const pips = [];
  if (value % 2 === 1) pips.push({x: c, y: c});
  if (value > 1) { pips.push({x: c-o, y: c-o}); pips.push({x: c+o, y: c+o}); }
  if (value > 3) { pips.push({x: c-o, y: c+o}); pips.push({x: c+o, y: c-o}); }
  if (value === 6) { pips.push({x: c-o, y: c}); pips.push({x: c+o, y: c}); }
  return pips;
}

// Add simple noise for texture
function addNoise(ctx: CanvasRenderingContext2D, size: number) {
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 10;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
        data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
}

// Helper to darken hex color
function adjustColor(color: string, amount: number) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}
