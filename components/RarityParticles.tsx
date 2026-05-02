import React, { useEffect, useRef } from 'react';

interface Props {
  rarity: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  hue?: number;
}

const RarityParticles: React.FC<Props> = ({ rarity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // --- Configuration Logic ---
    const getConfig = () => {
      switch (rarity) {
        case 'UR':
          return { count: 12, type: 'UR' };
        case 'SSR':
          return { count: 8, type: 'SSR' };
        case 'SR':
          return { count: 3, type: 'SR' };
        case 'R':
        default:
          return { count: 0, type: 'R' };
      }
    };

    const config = getConfig();

    const createParticle = (): Particle => {
      const w = canvas.width;
      const h = canvas.height;
      let x, y, vx, vy, color, life, size, hue;

      // Define an inner margin to simulate the card edge
      // Since the particle canvas is larger than the card (inset -12 ~ 48px larger),
      // The "Card Border" is roughly 24px-30px inside the canvas edge.
      const margin = 24;
      const innerW = w - margin * 2;
      const innerH = h - margin * 2;

      if (config.type === 'UR' || config.type === 'SSR') {
        // --- EMISSION FROM BORDER (INSIDE OUT) ---

        // 1. Pick a random point along the perimeter of the inner rectangle
        const perimeter = 2 * innerW + 2 * innerH;
        const r = Math.random() * perimeter;

        // Calculate spawn position (x, y) on the perimeter
        if (r < innerW) { // Top Edge
            x = margin + r;
            y = margin;
        } else if (r < innerW + innerH) { // Right Edge
            x = w - margin;
            y = margin + (r - innerW);
        } else if (r < 2 * innerW + innerH) { // Bottom Edge
            x = w - margin - (r - (innerW + innerH));
            y = h - margin;
        } else { // Left Edge
            x = margin;
            y = h - margin - (r - (2 * innerW + innerH));
        }

        // 2. Calculate Velocity: Normal vector from center to spawn point
        const centerX = w / 2;
        const centerY = h / 2;

        // Vector from center to point
        let dirX = x - centerX;
        let dirY = y - centerY;

        // Normalize
        const len = Math.sqrt(dirX*dirX + dirY*dirY);
        if (len > 0) {
            dirX /= len;
            dirY /= len;
        }

        const speedBase = config.type === 'UR' ? 2.5 : 1.5;
        const speedVar = Math.random() * 1.5;
        vx = dirX * (speedBase + speedVar);
        vy = dirY * (speedBase + speedVar);

        // Properties
        if (config.type === 'UR') {
            hue = Math.random() * 360;
            color = `hsla(${hue}, 100%, 70%, 1)`;
            size = Math.random() * 5 + 2;
            life = Math.random() * 40 + 20;
        } else {
            // SSR: Gold
            color = `rgba(251, 191, 36, ${Math.random() * 0.8 + 0.2})`; // Amber/Gold
            size = Math.random() * 4 + 1;
            life = Math.random() * 50 + 30;
        }

      } else {
        // --- SR: Standard Rising (Keep existing behavior for SR or adjust if needed) ---
        // Let's keep SR internal bubbling for contrast
        x = Math.random() * w;
        y = h + 10;
        vx = (Math.random() - 0.5) * 0.5;
        vy = -(Math.random() * 1.5 + 0.5);
        color = `rgba(168, 85, 247, ${Math.random() * 0.6 + 0.3})`;
        size = Math.random() * 3 + 1;
        life = Math.random() * 60 + 40;
      }

      return { x, y, vx, vy, size, life, maxLife: life, color, hue };
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter'; // Glow effect

      // Spawn new particles
      if (config.type !== 'R') {
          // Spawn rate
          const spawnRate = config.type === 'UR' ? 5 : (config.type === 'SSR' ? 3 : 1);
          for(let i=0; i<spawnRate; i++) {
              if(particlesRef.current.length < (config.type === 'UR' ? 200 : 100)) {
                  particlesRef.current.push(createParticle());
              }
          }
      }

      // Update & Draw
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life--;

        // Movement
        p.x += p.vx;
        p.y += p.vy;

        // Visuals based on Type
        if (config.type === 'UR') {
            // Rainbow Shift
            p.hue = (p.hue || 0) + 10;
            p.color = `hsla(${p.hue}, 100%, 60%, ${p.life / p.maxLife})`;
            // Slight jitter
            p.vx += (Math.random() - 0.5) * 0.1;
            p.vy += (Math.random() - 0.5) * 0.1;
        }
        else if (config.type === 'SSR') {
            // Gold Sparkle flicker
            if (Math.random() > 0.95) p.size = Math.random() * 6;
            else p.size = Math.max(0.5, p.size * 0.95);

            // Add slight gravity/drag so they don't fly infinitely fast linear
            p.vx *= 0.98;
            p.vy *= 0.98;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [rarity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

export default RarityParticles;
