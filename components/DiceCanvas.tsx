
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { generateFantasyMaterialSets, generateNumericMaterials, generateRaceMaterials } from '../services/textureService';
import { Inventory, GameState } from '../types';
import { audioService } from '../services/audioService';

interface Props {
  onRollComplete: (result: any) => void;
  onDiceUpdate: (result: any) => void;
  onAssetsLoaded: () => void;
  fixedDiceIndices: number[];      // 刻印锁定的 (蓝色)
  weightedDiceIndices: number[];   // 灌铅锁定的 (金色)
  onDiceClick: (index: number) => void;
  onWeightedDiceUsed: (index: number) => void;
  inventory: Inventory;
  gameState: GameState;
}

export interface DiceCanvasRef {
  throwDice: (force: number) => void;
  resetWeightedDice: () => void;  // 恢复被灌铅骰子到原始状态
}

const DiceCanvas = forwardRef<DiceCanvasRef, Props>((props, ref) => {
  const { onRollComplete, onDiceUpdate, onAssetsLoaded, fixedDiceIndices, weightedDiceIndices, onDiceClick, onWeightedDiceUsed, inventory, gameState } = props;
  
  // 使用 Ref 追踪最新的 props
  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; }, [props]);

  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<CANNON.World>(new CANNON.World());
  const diceBodiesRef = useRef<CANNON.Body[]>([]);
  const diceMeshesRef = useRef<THREE.Mesh[]>([]);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const isRollingRef = useRef(false);
  const initializedRef = useRef(false);

  // 保存骰子被灌铅操作前的原始四元数状态
  const originalQuaternionsRef = useRef<Map<number, { mesh: THREE.Quaternion; body: CANNON.Quaternion }>>(new Map());

  // 交互状态 Refs
  const interactionRef = useRef<{
    startTime: number;
    timerId: any;
    targetIndex: number | null;
    isDragging: boolean;
    lastMouse: THREE.Vector2;
  }>({
    startTime: 0,
    timerId: null,
    targetIndex: null,
    isDragging: false,
    lastMouse: new THREE.Vector2()
  });

  // 初始化场景
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const scene = new THREE.Scene();
    // 画布保持透明，让应用背景在骰子后方显示，避免 UI 遮罩压暗骰子。
    const bgColor = 0x101b33;
    scene.background = null;
    scene.fog = new THREE.Fog(bgColor, 20, 50);

    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 32, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Tone mapping adjusted for solid look
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Enhanced Lighting for Light Mode - Balanced
    const ambient = new THREE.AmbientLight(0xdbeafe, 0.58); 
    scene.add(ambient);

    // Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0xf8e7b5, 0x111827, 0.5);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Main Directional Light (Sun)
    const light = new THREE.DirectionalLight(0xffe8b0, 1.35);
    light.position.set(10, 30, 15);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 100;
    light.shadow.bias = -0.001;
    // Soften shadows
    light.shadow.radius = 4;
    scene.add(light);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    fillLight.position.set(-10, 20, -10);
    scene.add(fillLight);

    const world = worldRef.current;
    world.gravity.set(0, -45, 0);

    // 地面 & 墙壁
    const groundMat = new CANNON.Material("ground");
    const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2);
    world.addBody(groundBody);

    // Shadow receiver plane (Visual only)
    const planeGeo = new THREE.CircleGeometry(16, 96);
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x111a30,
      roughness: 0.62,
      metalness: 0.12,
      transparent: true,
      opacity: 0.68
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.rotation.x = -Math.PI / 2;
    planeMesh.receiveShadow = true;
    scene.add(planeMesh);

    const altarRing = new THREE.Mesh(
      new THREE.RingGeometry(6.5, 7.15, 128),
      new THREE.MeshBasicMaterial({
        color: 0xd6b46a,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide
      })
    );
    altarRing.rotation.x = -Math.PI / 2;
    altarRing.position.y = 0.012;
    scene.add(altarRing);

    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.28, 96),
      new THREE.MeshBasicMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide
      })
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.016;
    scene.add(innerRing);

    const wallMat = new CANNON.Material("wall");
    const wallShape = new CANNON.Plane();
    const addWall = (x: number, z: number, angle: number, axis: CANNON.Vec3) => {
      const b = new CANNON.Body({ mass: 0, material: wallMat });
      b.addShape(wallShape);
      b.position.set(x, 0, z);
      b.quaternion.setFromAxisAngle(axis, angle);
      world.addBody(b);
    };
    addWall(-7.5, 0, Math.PI/2, new CANNON.Vec3(0, 1, 0)); 
    addWall(7.5, 0, -Math.PI/2, new CANNON.Vec3(0, 1, 0));
    addWall(0, -8, 0, new CANNON.Vec3(1, 0, 0)); 
    addWall(0, 8, Math.PI, new CANNON.Vec3(1, 0, 0));

    // 材质
    const diceGeo = new RoundedBoxGeometry(1.8, 1.8, 1.8, 4, 0.2);
    const materials = {
        fantasy: generateFantasyMaterialSets(),
        numeric: generateNumericMaterials(),
        race: generateRaceMaterials()
    };
    const diceMat = new CANNON.Material("dice");
    const contact = new CANNON.ContactMaterial(groundMat, diceMat, { friction: 0.5, restitution: 0.2 });
    const diceContact = new CANNON.ContactMaterial(diceMat, diceMat, { friction: 0.3, restitution: 0.3 });
    world.addContactMaterial(contact);
    world.addContactMaterial(diceContact);

    const createDie = (mats: THREE.Material[], x: number, z: number, index: number) => {
        const mesh = new THREE.Mesh(diceGeo, mats.map(m => m.clone()));
        mesh.castShadow = true;
        mesh.userData = { index };
        scene.add(mesh);
        diceMeshesRef.current.push(mesh);
        
        const body = new CANNON.Body({ 
            mass: 1, 
            shape: new CANNON.Box(new CANNON.Vec3(0.9, 0.9, 0.9)),
            material: diceMat,
            linearDamping: 0.05, 
            angularDamping: 0.05
        });
        body.position.set(x, 2, z);
        world.addBody(body);
        diceBodiesRef.current.push(body);
    };

    for(let i=0; i<6; i++) createDie(materials.fantasy[i], (i-2.5)*2.5, -1.5, i);
    createDie(materials.numeric, -2.5, 2.5, 6);
    createDie(materials.race, 2.5, 2.5, 7);

    // 交互逻辑
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getIntersects = (clientX: number, clientY: number) => {
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        return raycaster.intersectObjects(diceMeshesRef.current);
    };

    const handleDown = (clientX: number, clientY: number) => {
        if (isRollingRef.current) return;
        const intersects = getIntersects(clientX, clientY);
        
        if (intersects.length > 0) {
            const idx = intersects[0].object.userData.index;
            
            // 记录初始状态
            interactionRef.current = {
                startTime: Date.now(),
                targetIndex: idx,
                isDragging: false,
                lastMouse: new THREE.Vector2(clientX, clientY),
                timerId: setTimeout(() => {
	                    // 长按触发 (灌铅骰子)
	                    const { inventory, fixedDiceIndices, weightedDiceIndices, gameState } = propsRef.current;
	                    
	                    // 仅在 CONTRACT_PENDING 或 REWARD_CHOICE 状态允许使用灌铅骰子 (修改面)
	                    // 并且：(已有库存 且 未被蓝色锁定) 或者 (已经被灌铅锁定/修改过，允许微调)
	                    const canUseWeightedDice = 
	                        (gameState === GameState.CONTRACT_PENDING || gameState === GameState.REWARD_CHOICE) &&
	                        (weightedDiceIndices.includes(idx) || (inventory.weightedDice > 0 && !fixedDiceIndices.includes(idx)));

                    if (canUseWeightedDice) {
                        interactionRef.current.isDragging = true;

                        const body = diceBodiesRef.current[idx];
                        const mesh = diceMeshesRef.current[idx];

                        // 如果这个骰子还没有被灌铅过，保存原始状态
                        if (!weightedDiceIndices.includes(idx) && !originalQuaternionsRef.current.has(idx)) {
                            originalQuaternionsRef.current.set(idx, {
                                mesh: mesh.quaternion.clone(),
                                body: body.quaternion.clone()
                            });
                        }

                        body.type = CANNON.Body.STATIC;
                        body.velocity.set(0,0,0);
                        body.angularVelocity.set(0,0,0);
                    }
                }, 500) // 500ms 长按阈值
            };
        }
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (interactionRef.current.isDragging && interactionRef.current.targetIndex !== null) {
            const idx = interactionRef.current.targetIndex;
            const mesh = diceMeshesRef.current[idx];
            const body = diceBodiesRef.current[idx];
            
            // 计算鼠标增量
            const deltaX = clientX - interactionRef.current.lastMouse.x;
            const deltaY = clientY - interactionRef.current.lastMouse.y;
            interactionRef.current.lastMouse.set(clientX, clientY);

            // 旋转网格 (基于世界坐标系的轴旋转)
            const rotateSpeed = 0.01;
            mesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), deltaX * rotateSpeed);
            mesh.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), deltaY * rotateSpeed);

            // 同步Body
            body.quaternion.copy(mesh.quaternion as any);
        }
    };

    const handleUp = () => {
        if (interactionRef.current.timerId) clearTimeout(interactionRef.current.timerId);
        
        const { targetIndex, isDragging, startTime } = interactionRef.current;
        
        if (targetIndex !== null) {
            if (isDragging) {
                // 拖拽结束：吸附到最近的面
                snapToNearestFace(targetIndex);
                propsRef.current.onWeightedDiceUsed(targetIndex);
                // 拖拽修改后，立即更新结果
                propsRef.current.onDiceUpdate(getResults());
            } else {
                // 短按：普通点击逻辑 (仅 IDLE 状态允许刻印锁定，或保持原逻辑)
                // 用户要求：灌铅骰子只在 CONTRACT_PENDING 使用
                // 刻印骰子通常在投掷前使用 (IDLE)
                if (Date.now() - startTime < 500) {
                   // 只在 IDLE 状态允许点击锁定/解锁
                   if (propsRef.current.gameState === GameState.IDLE) {
                       propsRef.current.onDiceClick(targetIndex);
                   }
                }
            }
        }

        // 重置
        interactionRef.current = {
            startTime: 0,
            timerId: null,
            targetIndex: null,
            isDragging: false,
            lastMouse: new THREE.Vector2()
        };
    };

    // 辅助：吸附到最近的面
    const snapToNearestFace = (idx: number) => {
        const mesh = diceMeshesRef.current[idx];
        const body = diceBodiesRef.current[idx];

        // 骰子的6个局部法线方向
        const localDirs = [
            new THREE.Vector3(0, 1, 0),  // Up
            new THREE.Vector3(0, -1, 0), // Down
            new THREE.Vector3(1, 0, 0),  // Right
            new THREE.Vector3(-1, 0, 0), // Left
            new THREE.Vector3(0, 0, 1),  // Front
            new THREE.Vector3(0, 0, -1)  // Back
        ];

        let maxDot = -Infinity;
        let bestDir = localDirs[0];

        // 寻找当前最接近世界Up (0,1,0) 的局部轴
        const worldUp = new THREE.Vector3(0, 1, 0);
        localDirs.forEach(dir => {
            const worldDir = dir.clone().applyQuaternion(mesh.quaternion);
            const dot = worldDir.dot(worldUp);
            if (dot > maxDot) {
                maxDot = dot;
                bestDir = dir;
            }
        });

        // 计算旋转四元数，把 bestDir 对齐到 worldUp
        const currentWorldDir = bestDir.clone().applyQuaternion(mesh.quaternion);
        const axis = new THREE.Vector3().crossVectors(currentWorldDir, worldUp).normalize();
        const angle = currentWorldDir.angleTo(worldUp);
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        
        mesh.quaternion.premultiply(q); // 应用旋转
        body.quaternion.copy(mesh.quaternion as any);
        body.type = CANNON.Body.STATIC; // 保持固定
    };

    // 事件监听
    const onMouseDown = (e: MouseEvent) => handleDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleUp();
    
    const onTouchStart = (e: TouchEvent) => handleDown(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = () => handleUp();

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    // 动画循环
    let frameId: number;
    const animate = () => {
        frameId = requestAnimationFrame(animate);
        world.step(1/60);

        // 从 Ref 中获取最新的锁定状态
        const { fixedDiceIndices, weightedDiceIndices, gameState } = propsRef.current;
        
        diceMeshesRef.current.forEach((m, i) => {
            const interaction = interactionRef.current;
            // 如果正在拖拽该骰子，跳过物理同步，因为位置由鼠标控制
            if (interaction.isDragging && interaction.targetIndex === i) {
                 // do nothing
            } else {
                m.position.copy(diceBodiesRef.current[i].position as any);
                m.quaternion.copy(diceBodiesRef.current[i].quaternion as any);
            }

            // 视觉更新：颜色 & 缩放
            // 必须使用从 ref 获取的最新 indices
            const isFixed = fixedDiceIndices.includes(i);
            const isWeighted = weightedDiceIndices.includes(i);
            const isInteracting = interaction.isDragging && interaction.targetIndex === i;

            if (isFixed || isWeighted || isInteracting) {
                m.scale.set(1.15, 1.15, 1.15);
                (m.material as THREE.MeshStandardMaterial[]).forEach(mat => {
                    // 金色：灌铅锁定 或 正在灌铅操作
                    if (isInteracting || isWeighted) {
                        mat.emissive = new THREE.Color(0xf59e0b); 
                        mat.emissiveIntensity = 0.5; // Slightly reduced emission for light background
                    } else {
                        // 蓝色：普通刻印锁定
                        mat.emissive = new THREE.Color(0x3b82f6); 
                        mat.emissiveIntensity = 0.5;
                    }
                });
            } else {
                m.scale.set(1, 1, 1);
                (m.material as THREE.MeshStandardMaterial[]).forEach(mat => {
                    mat.emissive = new THREE.Color(0x000000);
                    mat.emissiveIntensity = 0;
                });
            }
        });
        renderer.render(scene, camera);
    };
    animate();
    onAssetsLoaded();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => { 
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []); // End init useEffect

  // 监听外部锁定变化，设置物理状态
  useEffect(() => {
    diceBodiesRef.current.forEach((body, i) => {
      const isLocked = fixedDiceIndices.includes(i) || weightedDiceIndices.includes(i);
      
      if (isLocked) {
        body.type = CANNON.Body.STATIC;
        body.velocity.set(0,0,0);
        body.angularVelocity.set(0,0,0);
      } else {
        // 如果不在锁定状态，且当前不是拖拽中，则恢复动态
        // 注意：在 CONTRACT_PENDING 状态，骰子也应该是静止的，但这里主要是控制 Locked 状态
        // 实际上 dice sleep 后就是静止的。这里主要用于 pre-roll 的锁定。
        if (body.type === CANNON.Body.STATIC && !interactionRef.current.isDragging) {
             body.type = CANNON.Body.DYNAMIC;
             body.wakeUp();
        }
      }
    });
  }, [fixedDiceIndices, weightedDiceIndices]);

  useImperativeHandle(ref, () => ({
    throwDice: (force: number) => {
      if(isRollingRef.current) return;
      isRollingRef.current = true;

      // 播放骰子投掷音效
      audioService.play('dice_throw');

      // 使用 ref 获取最新状态
      const { fixedDiceIndices } = propsRef.current;

      // 清空保存的原始状态（新的投掷）
      originalQuaternionsRef.current.clear();

      diceBodiesRef.current.forEach((b, i) => {
          if (fixedDiceIndices.includes(i)) return; // 刻印锁定不重投

          // 确保骰子是动态的并且醒着
          b.type = CANNON.Body.DYNAMIC;
          b.wakeUp();

          // 设置新位置（在空中）
          b.position.set((Math.random()-0.5)*3, 12 + i*0.8, (Math.random()-0.5)*2);
          b.velocity.set((Math.random()-0.5)*force*0.8, -force*0.5, (Math.random()-0.5)*force*0.8);
          b.angularVelocity.set(Math.random()*20, Math.random()*20, Math.random()*20);
      });

      const startTime = Date.now();
      const checkStopped = () => {
          const interval = setInterval(() => {
              const { fixedDiceIndices: currentFixed } = propsRef.current;

              const allStopped = diceBodiesRef.current.every((b, i) => {
                if (currentFixed.includes(i)) return true;
                return b.velocity.length() < 0.15 && b.angularVelocity.length() < 0.15;
              });

              if (allStopped || Date.now() - startTime > 4000) {
                  clearInterval(interval);
                  isRollingRef.current = false;
                  diceBodiesRef.current.forEach(b => b.sleep());
                  onRollComplete(getResults());
              }
          }, 200);
      };
      setTimeout(checkStopped, 1000);
    },

    // 恢复被灌铅骰子到原始状态
    resetWeightedDice: () => {
      originalQuaternionsRef.current.forEach((saved, idx) => {
        const mesh = diceMeshesRef.current[idx];
        const body = diceBodiesRef.current[idx];

        if (mesh && body) {
          // 恢复四元数
          mesh.quaternion.copy(saved.mesh);
          body.quaternion.copy(saved.body);

          // 确保骰子静止
          body.type = CANNON.Body.STATIC;
          body.velocity.set(0, 0, 0);
          body.angularVelocity.set(0, 0, 0);
        }
      });

      // 清空保存的状态
      originalQuaternionsRef.current.clear();

      // 触发结果更新
      propsRef.current.onDiceUpdate(getResults());
    }
  }));

  const getResults = () => {
      const faceMap = [
          {v: new CANNON.Vec3(1,0,0), val: 3}, {v: new CANNON.Vec3(-1,0,0), val: 4},
          {v: new CANNON.Vec3(0,1,0), val: 1}, {v: new CANNON.Vec3(0,-1,0), val: 6},
          {v: new CANNON.Vec3(0,0,1), val: 2}, {v: new CANNON.Vec3(0,0,-1), val: 5}
      ];
      const getVal = (body: CANNON.Body) => {
          let maxDot = -1, res = 1;
          faceMap.forEach(f => {
              const wn = new CANNON.Vec3();
              body.quaternion.vmult(f.v, wn);
              if (wn.y > maxDot) { maxDot = wn.y; res = f.val; }
          });
          return res;
      };
      return { 
        rawAttributes: diceBodiesRef.current.slice(0, 6).map(getVal), 
        destinyPoint: getVal(diceBodiesRef.current[6]), 
        racePoint: getVal(diceBodiesRef.current[7]) 
      };
  };

  return <div ref={containerRef} className="absolute inset-0 z-[2]" />;
});

export default DiceCanvas;
