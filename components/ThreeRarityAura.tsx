import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  rarity: string;
  intensity?: 'normal' | 'large' | 'burst';
  className?: string;
}

type AuraTheme = {
  core: string;
  accent: string;
  glow: string;
  count: number;
  ringCount: number;
  speed: number;
  pulse: number;
};

const getAuraTheme = (rarity: string): AuraTheme => {
  switch (rarity) {
    case 'UR':
      return {
        core: '#fb7185',
        accent: '#22d3ee',
        glow: '#facc15',
        count: 180,
        ringCount: 4,
        speed: 1.45,
        pulse: 0.08
      };
    case 'SSR':
      return {
        core: '#facc15',
        accent: '#fb923c',
        glow: '#fef3c7',
        count: 130,
        ringCount: 3,
        speed: 1.05,
        pulse: 0.06
      };
    case 'SR':
      return {
        core: '#a78bfa',
        accent: '#38bdf8',
        glow: '#ddd6fe',
        count: 90,
        ringCount: 2,
        speed: 0.78,
        pulse: 0.045
      };
    case 'R':
    default:
      return {
        core: '#60a5fa',
        accent: '#93c5fd',
        glow: '#dbeafe',
        count: 54,
        ringCount: 1,
        speed: 0.55,
        pulse: 0.03
      };
  }
};

const ThreeRarityAura: React.FC<Props> = ({ rarity, intensity = 'normal', className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const theme = getAuraTheme(rarity);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const coreColor = new THREE.Color(theme.core);
    const accentColor = new THREE.Color(theme.accent);
    const glowColor = new THREE.Color(theme.glow);
    const isBurst = intensity === 'burst';
    const isLarge = intensity === 'large' || isBurst;

    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < theme.ringCount; i++) {
      const radius = (isBurst ? 0.56 : 0.48) + i * (isBurst ? 0.15 : 0.12);
      const tube = isBurst ? (rarity === 'UR' ? 0.007 : 0.008) : (rarity === 'UR' ? 0.0045 : 0.006);
      const geometry = new THREE.TorusGeometry(radius, tube, 8, 128);
      const color = i % 2 === 0 ? coreColor : accentColor;
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: (isBurst ? 0.7 : 0.48) - i * 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.userData.rotationSpeed = (i % 2 === 0 ? 1 : -1) * (0.15 + i * 0.07) * theme.speed;
      ring.userData.baseScaleY = 0.36 + i * 0.025;
      ring.userData.phase = i * 1.4;
      group.add(ring);
      rings.push(ring);
    }

    const particleCount = isBurst ? Math.floor(theme.count * 1.9) : (isLarge ? Math.floor(theme.count * 1.25) : theme.count);
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const meta = Array.from({ length: particleCount }, (_, index) => {
      const orbit = index / particleCount;
      const radius = (isBurst ? 0.44 : 0.38) + Math.random() * (isBurst ? 0.78 : 0.55);
      const speed = (0.2 + Math.random() * (isBurst ? 0.65 : 0.42)) * theme.speed * (Math.random() > 0.5 ? 1 : -1);
      const height = (Math.random() - 0.5) * (isBurst ? 0.22 : 0.12);
      const phase = Math.random() * Math.PI * 2;
      const tint = rarity === 'UR' ? new THREE.Color().setHSL(orbit, 0.92, 0.68) : coreColor.clone().lerp(accentColor, Math.random());
      colors[index * 3] = tint.r;
      colors[index * 3 + 1] = tint.g;
      colors[index * 3 + 2] = tint.b;
      return { angle: phase, radius, speed, height, wobble: (isBurst ? 0.05 : 0.02) + Math.random() * (isBurst ? 0.12 : 0.08) };
    });

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: isBurst ? (rarity === 'UR' ? 0.045 : 0.038) : (rarity === 'UR' ? 0.025 : 0.02),
      vertexColors: true,
      transparent: true,
      opacity: isBurst ? 0.96 : (rarity === 'R' ? 0.55 : 0.82),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    group.add(particles);

    const coreGeometry = new THREE.CircleGeometry(0.13, 64);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: isBurst ? 0.34 : (rarity === 'R' ? 0.12 : 0.2),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.scale.set(2.2, 0.48, 1);
    group.add(core);

    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      const aspect = width / height;
      camera.left = -aspect;
      camera.right = aspect;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      const xScale = isBurst ? Math.min(aspect * 1.24, 2.65) : (isLarge ? Math.min(aspect * 1.08, 2.2) : Math.min(aspect * 0.92, 1.8));
      group.scale.set(xScale, 1, 1);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frameId = 0;
    const start = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - start) / 1000;
      const pulse = 1 + Math.sin(elapsed * 2.4) * theme.pulse;

      rings.forEach((ring, index) => {
        ring.rotation.z = elapsed * ring.userData.rotationSpeed;
        const scaleY = ring.userData.baseScaleY + Math.sin(elapsed * 1.7 + ring.userData.phase) * 0.025;
        ring.scale.set(pulse, scaleY * pulse, 1);
        const material = ring.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(isBurst ? 0.28 : 0.16, (isBurst ? 0.64 : 0.45) - index * 0.08 + Math.sin(elapsed * 2 + index) * (isBurst ? 0.14 : 0.08));
      });

      meta.forEach((p, index) => {
        p.angle += p.speed * 0.012;
        const shimmer = Math.sin(elapsed * 3 + p.angle * 2) * p.wobble;
        const radius = p.radius + shimmer;
        positions[index * 3] = Math.cos(p.angle) * radius;
        positions[index * 3 + 1] = Math.sin(p.angle) * radius * (isBurst ? 0.52 : 0.36) + p.height + Math.sin(elapsed * 2 + index) * (isBurst ? 0.025 : 0.012);
        positions[index * 3 + 2] = Math.sin(p.angle * 2 + elapsed) * 0.06;

        if (rarity === 'UR') {
          const tint = new THREE.Color().setHSL((elapsed * 0.07 + index / particleCount) % 1, 0.95, 0.68);
          colors[index * 3] = tint.r;
          colors[index * 3 + 1] = tint.g;
          colors[index * 3 + 2] = tint.b;
        }
      });

      particleGeometry.attributes.position.needsUpdate = true;
      if (rarity === 'UR') particleGeometry.attributes.color.needsUpdate = true;
      core.scale.set(2.2 * pulse, 0.48 * pulse, 1);
      core.rotation.z = elapsed * 0.12;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      mount.removeChild(renderer.domElement);
      particleGeometry.dispose();
      particleMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      rings.forEach(ring => {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, [rarity, intensity]);

  return <div ref={mountRef} className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} />;
};

export default ThreeRarityAura;
