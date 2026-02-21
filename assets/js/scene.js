import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { CHAPTERS } from "../data/chapters.js";

export function initTourScene({
  root: M_root,
  canvas: M_canvas,
  tour: M_tour,
  tourToggle: M_tourToggle,
  headline: M_headline,
  subline: M_subline,
  chapterKey: M_chKey,
  chapterName: M_chName,
  modeLabel: M_modeLabel,
  modeHint: M_modeHint,
  reducedMotion: M_reducedMotion,
}) {
  // --------- Helpers
  const M_clamp01 = (x)=> Math.max(0, Math.min(1, x));
  const M_lerp = (a,b,t)=> a + (b-a)*t;
  const M_damp = (c,t,lambda,dt)=> M_lerp(c, t, 1 - Math.exp(-lambda * dt));

  // --------- Tour enabled
  let M_tourEnabled = !M_reducedMotion && location.hash !== "#express";
  M_tourToggle.textContent = M_tourEnabled ? "Tour: ON" : "Tour: OFF";

  // --------- Three setup
  const M_renderer = new THREE.WebGLRenderer({ canvas: M_canvas, antialias:true, alpha:true, powerPreference:"high-performance" });
  M_renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const M_scene = new THREE.Scene();
  const M_camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  M_camera.position.set(0, 0.25, 7.6);

  M_scene.add(new THREE.AmbientLight(0xffffff, 0.28));
  const M_keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
  M_keyLight.position.set(3.2, 4.2, 4.8);
  M_scene.add(M_keyLight);

  function M_handleResize(){
    const w = window.innerWidth, h = window.innerHeight;
    M_renderer.setSize(w, h, false);
    M_camera.aspect = w / h;
    M_camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", M_handleResize, { passive:true });
  M_handleResize();

  // --------- Scroll progress
  function M_rawScrollProgress(){
    const r = M_tour.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    const scrolled = -r.top;
    return M_clamp01(total <= 0 ? 0 : (scrolled / total));
  }

  // --------- Background dust
  const M_dustCount = 700;
  const M_dustGeo = new THREE.BufferGeometry();
  const M_dustPos = new Float32Array(M_dustCount * 3);
  for (let i=0;i<M_dustCount;i++){
    M_dustPos[i*3+0] = (Math.random()*2-1) * 26;
    M_dustPos[i*3+1] = (Math.random()*2-1) * 16;
    M_dustPos[i*3+2] = -Math.random() * 44;
  }
  M_dustGeo.setAttribute("position", new THREE.BufferAttribute(M_dustPos, 3));
  const M_dustMat = new THREE.PointsMaterial({ color:0xffffff, size:0.018, transparent:true, opacity:0.10, depthWrite:false });
  const M_dust = new THREE.Points(M_dustGeo, M_dustMat);
  M_scene.add(M_dust);

  // --------- GLSL noise
  const M_noiseGLSL = `
    float hash(vec3 p){
      p = fract(p * 0.3183099 + vec3(0.1,0.2,0.3));
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float vnoise(vec3 p){
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f*f*(3.0-2.0*f);
      float n000 = hash(i + vec3(0,0,0));
      float n100 = hash(i + vec3(1,0,0));
      float n010 = hash(i + vec3(0,1,0));
      float n110 = hash(i + vec3(1,1,0));
      float n001 = hash(i + vec3(0,0,1));
      float n101 = hash(i + vec3(1,0,1));
      float n011 = hash(i + vec3(0,1,1));
      float n111 = hash(i + vec3(1,1,1));
      float n00 = mix(n000, n100, f.x);
      float n10 = mix(n010, n110, f.x);
      float n01 = mix(n001, n101, f.x);
      float n11 = mix(n011, n111, f.x);
      float n0 = mix(n00, n10, f.y);
      float n1 = mix(n01, n11, f.y);
      return mix(n0, n1, f.z);
    }
  `;

  // --------- Mascot shader (strong contrast)
  const M_coreGeo = new THREE.IcosahedronGeometry(1.25, 5);

  const M_coreMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uP: { value: 0.0 },
      uTurb: { value: 0.10 },
      uOver: { value: 0.0 },
      uPulse:{ value: 0.0 },
      uMix:  { value: 0.80 },
      uC1: { value: new THREE.Color(1.0, 0.05, 0.55) },
      uC2: { value: new THREE.Color(0.0, 1.0, 0.85) },
      uC3: { value: new THREE.Color(1.0, 0.90, 0.10) },
      uBase:{ value: new THREE.Color(0.98, 0.98, 1.0) }
    },
    vertexShader: `
      precision highp float;
      uniform float uTime;
      uniform float uP;
      uniform float uTurb;
      uniform float uOver;
      varying float vFres;
      varying float vN;
      varying vec3 vPos;
      ${M_noiseGLSL}
      void main(){
        vec3 p = position;
        float t = uTime*0.38 + uP*2.0;

        float n1 = vnoise(p*1.55 + vec3(t, t*0.8, -t*0.45));
        float n2 = vnoise(p*3.10 + vec3(-t*0.6, t, t*0.65));
        float n = (n1*0.62 + n2*0.38);
        vN = n;

        float amp = uTurb * (1.0 + uOver*1.25);
        vec3 displaced = p + normal * (n - 0.5) * amp;

        vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mv;

        vec3 vNrm = normalize(normalMatrix * normal);
        vec3 vV = normalize(-mv.xyz);
        vFres = pow(1.0 - max(dot(vNrm, vV), 0.0), 2.0);

        vPos = displaced;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uBase;
      uniform vec3 uC1;
      uniform vec3 uC2;
      uniform vec3 uC3;
      uniform float uOver;
      uniform float uPulse;
      uniform float uMix;
      varying float vFres;
      varying float vN;
      varying vec3 vPos;

      float sat(float x){ return clamp(x, 0.0, 1.0); }

      void main(){
        float k = sat(0.40 + vN*0.90 + vPos.y*0.18);
        vec3 tri = mix(uC1, uC2, k);
        tri = mix(tri, uC3, sat(vPos.x*0.22 + 0.5));

        vec3 col = mix(uBase, tri, uMix + uOver*0.08);

        col += vFres * (0.36 + uOver*0.75);
        col += uPulse * vec3(0.30, 0.26, 0.34);

        col = pow(col, vec3(0.95));
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const M_core = new THREE.Mesh(M_coreGeo, M_coreMat);

  // Wireframe
  const M_wireMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent:true, opacity:0.24 });
  const M_wire = new THREE.LineSegments(new THREE.WireframeGeometry(M_coreGeo), M_wireMat);
  M_core.add(M_wire);

  const M_mascot = new THREE.Group();
  M_mascot.add(M_core);
  M_scene.add(M_mascot);

  // Decorations
  function M_makeRing(r, y){
    const geo = new THREE.TorusGeometry(r, 0.02, 6, 96);
    const mat = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.0, blending: THREE.AdditiveBlending, depthWrite:false });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    return m;
  }
  const M_rails = new THREE.Group();
  M_rails.add(M_makeRing(1.58, 0.36));
  M_rails.add(M_makeRing(1.74, 0.00));
  M_rails.add(M_makeRing(1.58,-0.36));
  M_mascot.add(M_rails);

  const M_coil = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.08, 0.13, 240, 18, 2, 3),
    new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.0, blending: THREE.AdditiveBlending, depthWrite:false })
  );
  M_mascot.add(M_coil);

  function M_makeRibbon(){
    const pts = [];
    const turns = 150;
    for (let i=0;i<=turns;i++){
      const t = i/turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t)*2.05, Math.sin(t*2.0)*0.46, Math.sin(t)*2.05));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const geo = new THREE.TubeGeometry(curve, 540, 0.030, 10, true);
    const mat = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.0, blending: THREE.AdditiveBlending, depthWrite:false });
    return new THREE.Mesh(geo, mat);
  }
  const M_ribbon = M_makeRibbon();
  M_mascot.add(M_ribbon);

  // Neon Halo sprite + rings
  const M_haloCanvas = document.createElement("canvas");
  M_haloCanvas.width = 256; M_haloCanvas.height = 256;
  const M_hctx = M_haloCanvas.getContext("2d");
  const g = M_hctx.createRadialGradient(128,128,20,128,128,120);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.22, "rgba(255,60,180,0.55)");
  g.addColorStop(0.55, "rgba(0,255,220,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0.0)");
  M_hctx.fillStyle = g;
  M_hctx.beginPath(); M_hctx.arc(128,128,120,0,Math.PI*2); M_hctx.fill();

  const M_haloTex = new THREE.CanvasTexture(M_haloCanvas);
  if ("colorSpace" in M_haloTex && "SRGBColorSpace" in THREE) M_haloTex.colorSpace = THREE.SRGBColorSpace;

  const M_haloMat = new THREE.SpriteMaterial({ map: M_haloTex, transparent:true, opacity:0.0, blending: THREE.AdditiveBlending, depthWrite:false });
  const M_halo = new THREE.Sprite(M_haloMat);
  M_halo.scale.set(5.2,5.2,5.2);
  M_halo.position.set(0, 0.10, -0.2);
  M_mascot.add(M_halo);

  const M_haloRings = new THREE.Group();
  const ringGeo = new THREE.RingGeometry(1.85, 1.92, 96);
  const ringMat = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.0, blending: THREE.AdditiveBlending, depthWrite:false });
  const ring1 = new THREE.Mesh(ringGeo, ringMat.clone());
  const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
  ring2.scale.setScalar(1.10);
  ring1.rotation.x = Math.PI/2;
  ring2.rotation.x = Math.PI/2;
  M_haloRings.add(ring1, ring2);
  M_mascot.add(M_haloRings);

  // Burst lines (flick)
  const M_fxBurstLineCount = 72;
  const M_fxBurstGeo = new THREE.BufferGeometry();
  const M_fxBurstPos = new Float32Array(M_fxBurstLineCount * 2 * 3);
  for (let i=0;i<M_fxBurstLineCount;i++){
    const a = (i / M_fxBurstLineCount) * Math.PI * 2;
    const r0 = 1.55, r1 = 2.65;
    M_fxBurstPos[(i*2+0)*3+0] = Math.cos(a) * r0;
    M_fxBurstPos[(i*2+0)*3+1] = Math.sin(a) * r0 * 0.55;
    M_fxBurstPos[(i*2+0)*3+2] = Math.sin(a) * 0.15;

    M_fxBurstPos[(i*2+1)*3+0] = Math.cos(a) * r1;
    M_fxBurstPos[(i*2+1)*3+1] = Math.sin(a) * r1 * 0.55;
    M_fxBurstPos[(i*2+1)*3+2] = Math.sin(a) * 0.15;
  }
  M_fxBurstGeo.setAttribute("position", new THREE.BufferAttribute(M_fxBurstPos, 3));
  const M_fxBurstMat = new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.0, blending: THREE.AdditiveBlending });
  const M_fxBurstLines = new THREE.LineSegments(M_fxBurstGeo, M_fxBurstMat);
  M_fxBurstLines.renderOrder = 998;
  M_mascot.add(M_fxBurstLines);

  // Face sprite
  const M_faceCanvas = document.createElement("canvas");
  M_faceCanvas.width = 256; M_faceCanvas.height = 256;
  const M_fctx = M_faceCanvas.getContext("2d");
  const M_faceTex = new THREE.CanvasTexture(M_faceCanvas);
  if ("colorSpace" in M_faceTex && "SRGBColorSpace" in THREE) M_faceTex.colorSpace = THREE.SRGBColorSpace;

  const M_faceMat = new THREE.SpriteMaterial({ map: M_faceTex, transparent:true, depthTest:false, depthWrite:false });
  const M_face = new THREE.Sprite(M_faceMat);
  M_face.scale.set(1.18, 1.18, 1.18);
  M_face.position.set(0, 0.07, 1.40);
  M_face.renderOrder = 999;
  M_mascot.add(M_face);

  // Face state
  let M_blink=0, M_blinkTimer=0, M_nextBlink=1.2 + Math.random()*2.2;
  let M_mouth=0.20, M_brow=0.05, M_lookX=0, M_lookY=0, M_squint=0, M_grin=0;
  let M_winkKick = 0;

  function M_drawFace(){
    const ctx = M_fctx, w=256, h=256;
    ctx.clearRect(0,0,w,h);

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.beginPath(); ctx.arc(w/2, h/2, 102, 0, Math.PI*2);
    ctx.fillStyle="#ffffff"; ctx.fill();
    ctx.restore();

    const eyeY = 106 + M_lookY*10;
    const eyeX = 78;
    const px = M_lookX*12, py = M_lookY*10;
    const eyeOpen = Math.max(0.06, 1.0 - M_blink - M_squint*0.45);

    function eye(cx){
      ctx.save();
      ctx.translate(cx, eyeY);
      ctx.scale(1, eyeOpen);
      ctx.beginPath(); ctx.ellipse(0,0,22,18,0,0,Math.PI*2);
      ctx.fillStyle="#ffffff"; ctx.fill();
      ctx.restore();

      ctx.beginPath(); ctx.arc(cx+px, eyeY+py, 7, 0, Math.PI*2);
      ctx.fillStyle="#0b0b10"; ctx.fill();

      ctx.beginPath(); ctx.arc(cx+px-3, eyeY+py-3, 2, 0, Math.PI*2);
      ctx.fillStyle="rgba(255,255,255,0.85)"; ctx.fill();
    }
    eye(w/2 - eyeX); eye(w/2 + eyeX);

    ctx.save();
    ctx.strokeStyle="#0b0b10";
    ctx.lineWidth=6;
    ctx.lineCap="round";
    const browLift = M_brow * 16;
    function browLine(cx, tilt){
      ctx.beginPath();
      ctx.moveTo(cx-18, eyeY-36-browLift);
      ctx.lineTo(cx+18, eyeY-30+browLift*0.2 + tilt);
      ctx.stroke();
    }
    browLine(w/2-eyeX, -M_grin*4);
    browLine(w/2+eyeX,  M_grin*4);
    ctx.restore();

    ctx.save();
    ctx.translate(w/2, 168);
    ctx.strokeStyle="#0b0b10";
    ctx.lineWidth=8;
    ctx.lineCap="round";
    ctx.beginPath();
    ctx.scale(1, 0.50 + M_mouth*0.42 + M_grin*0.12);
    ctx.arc(0,0,35,Math.PI*0.13,Math.PI - Math.PI*0.13);
    ctx.stroke();
    ctx.restore();

    M_faceTex.needsUpdate = true;
  }

  // Chapters (more “you”, more personality on EXIT)
  const M_chapters = CHAPTERS;

  function M_chapterFor(p){
    let c = M_chapters[0];
    for (const ch of M_chapters) if (p >= ch.t) c = ch;
    return c;
  }

  // FX + interaction state
  let M_lastKey = M_chapters[0].key;
  let M_fxPulse = 0;
  let M_fxBurstAmt = 0;
  let M_spinKick = 0;

  let M_hasSpunOnStart = false;
  let M_wasNearBottom = false;

  let M_overdrive = 0.0;     // charged by hold
  let M_neon = 0.0;          // toggled by double tap
  let M_grab = 0.0;          // while dragging
  let M_grabRotX = 0.0;
  let M_grabRotY = 0.0;
  let M_grabVX = 0.0;
  let M_grabVY = 0.0;

  // pointer tracking (for face + steering)
  let M_ptrNX = 0, M_ptrNY = 0;
  function M_setPointerFromEvent(e){
    const rect = M_canvas.getBoundingClientRect();
    const x = (("clientX" in e) ? e.clientX : (e.touches?.[0]?.clientX ?? rect.left + rect.width/2));
    const y = (("clientY" in e) ? e.clientY : (e.touches?.[0]?.clientY ?? rect.top + rect.height/2));
    const nx = ((x - rect.left) / rect.width) * 2 - 1;
    const ny = ((y - rect.top) / rect.height) * 2 - 1;
    M_ptrNX = Math.max(-1, Math.min(1, nx));
    M_ptrNY = Math.max(-1, Math.min(1, ny));
  }

  // gesture tracking
  let M_down = false;
  let M_downTime = 0;
  let M_lastTapTime = 0;
  let M_lastX = 0, M_lastY = 0;
  let M_holdCharge = 0;

  function M_triggerBurst(){ M_fxBurstAmt = 1.0; }
  function M_toggleNeon(){ M_neon = (M_neon > 0.5) ? 0.0 : 1.0; }
  function M_thump(){
    M_fxPulse = 1.0;
    M_root.style.setProperty("--pulse","1");
    setTimeout(()=> M_root.style.setProperty("--pulse","0"), 120);
  }
  function M_wink(){
    M_winkKick = 1.0;
  }

  // Pointer events on canvas (mouse + touch)
  M_canvas.addEventListener("pointerdown", (e)=>{
    M_canvas.setPointerCapture?.(e.pointerId);
    M_down = true;
    M_downTime = performance.now();
    M_holdCharge = 0;
    M_grab = 1.0;

    M_setPointerFromEvent(e);
    M_lastX = e.clientX; M_lastY = e.clientY;

    // double tap/click toggle neon
    const now = performance.now();
    if (now - M_lastTapTime < 320){
      M_toggleNeon();
      M_lastTapTime = 0;
    } else {
      M_lastTapTime = now;
      // single tap gives wink + smug micro-thump
      M_wink();
      M_thump();
    }
  });

  M_canvas.addEventListener("pointermove", (e)=>{
    M_setPointerFromEvent(e);

    if (M_down){
      const dx = (e.clientX - M_lastX);
      const dy = (e.clientY - M_lastY);
      M_lastX = e.clientX; M_lastY = e.clientY;

      // drag affects rotation velocity
      M_grabVX += dx * 0.0016;
      M_grabVY += dy * 0.0014;
    }
  }, { passive:true });

  M_canvas.addEventListener("pointerup", ()=>{
    M_down = false;
    M_grab = 0.0;

    // release causes thump if charged
    if (M_holdCharge > 0.25){
      M_thump();
    }

    // flick detection
    const speed = Math.abs(M_grabVX) + Math.abs(M_grabVY);
    if (speed > 0.06){
      M_triggerBurst();
    }
  });

  // follow pointer even when not interacting
  window.addEventListener("pointermove", (e)=> M_setPointerFromEvent(e), { passive:true });

  // Tour toggle (no peek mode, no layout jump)
  M_tourToggle.addEventListener("click", ()=>{
    M_tourEnabled = !M_tourEnabled;
    M_tourToggle.textContent = M_tourEnabled ? "Tour: ON" : "Tour: OFF";
    if(!M_tourEnabled){
      location.hash = "#express";
    } else {
      M_renderOnce();
      const r = M_tour.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < window.innerHeight;
      if (visible) M_start();
    }
  });

  // --------- Render loop
  let M_running = false;
  let M_raf = 0;
  let M_lastT = performance.now();

  let M_pSmooth = 0;
  let M_turbSmooth = 0.10;
  let M_floatSpeed = 1.0;

  const M_form = { rails:0, coil:0, ribbon:0 };
  const M_baseC = new THREE.Color(), M_c1 = new THREE.Color(), M_c2 = new THREE.Color(), M_c3 = new THREE.Color();

  // face smoothing
  let M_mouthT=0.2, M_browT=0.0, M_squintT=0.0, M_grinT=0.0;
  let M_mouthS=0.2, M_browS=0.0, M_squintS=0.0, M_grinS=0.0;

  function M_renderOnce(){
    const now = performance.now();
    const dt = Math.min(0.05, (now - M_lastT)/1000);
    M_lastT = now;
    const time = now * 0.001;

    const themeDark = (M_root.dataset.theme === "dark");

    // wire color
    M_wireMat.color.setHex(themeDark ? 0xffffff : 0x000000);
    M_wireMat.opacity = themeDark ? 0.14 : 0.24;

    // decay FX
    M_fxPulse = M_damp(M_fxPulse, 0.0, 10.0, dt);
    M_fxBurstAmt = M_damp(M_fxBurstAmt, 0.0, 8.0, dt);
    M_winkKick = M_damp(M_winkKick, 0.0, 10.0, dt);

    // scroll
    const pRaw = M_rawScrollProgress();
    M_pSmooth = M_damp(M_pSmooth, pRaw, 10.0, dt);

    // return-to-top spin: only after visiting bottom
    if (M_pSmooth > 0.96) M_wasNearBottom = true;
    if (M_wasNearBottom && M_pSmooth < 0.10){
      M_spinKick += Math.PI * 2.0;
      M_wasNearBottom = false;
    }

    // spin on start once
    if (!M_hasSpunOnStart){
      M_hasSpunOnStart = true;
      M_spinKick += Math.PI * 2.0;
    }

    const ch = M_chapterFor(M_pSmooth);

    // UI
    M_chKey.textContent = ch.key;
    M_chName.textContent = ch.name;
    M_headline.textContent = ch.h;
    M_subline.innerHTML = `<span class="tag">${ch.name}</span>${ch.s}`;
    M_modeLabel.textContent = ch.name;
    M_modeHint.textContent = "Drag / hold / flick / tap → it reacts";

    // chapter thump only (no spin on every change)
    if (ch.key !== M_lastKey){
      M_lastKey = ch.key;
      M_thump();
    }

    // hold charge -> overdrive
    if (M_down){
      M_holdCharge = Math.min(1, M_holdCharge + dt * 0.65);
    } else {
      M_holdCharge = Math.max(0, M_holdCharge - dt * 0.85);
    }
    M_overdrive = M_damp(M_overdrive, M_holdCharge, 8.0, dt);

    // motion
    M_turbSmooth = M_damp(M_turbSmooth, ch.mot.turb * (1.0 + M_overdrive*1.35), 5.0, dt);
    M_floatSpeed = M_damp(M_floatSpeed, ch.mot.flo * (1.0 + M_overdrive*0.9), 4.5, dt);

    // palette
    const P = ch.pal;
    M_baseC.setRGB(P.base[0],P.base[1],P.base[2]);
    M_c1.setRGB(P.c1[0],P.c1[1],P.c1[2]);
    M_c2.setRGB(P.c2[0],P.c2[1],P.c2[2]);
    M_c3.setRGB(P.c3[0],P.c3[1],P.c3[2]);

    M_coreMat.uniforms.uTime.value = time;
    M_coreMat.uniforms.uP.value = M_pSmooth;
    M_coreMat.uniforms.uTurb.value = M_turbSmooth;
    M_coreMat.uniforms.uOver.value = M_overdrive;
    M_coreMat.uniforms.uPulse.value = M_fxPulse;

    M_coreMat.uniforms.uMix.value = themeDark ? 0.74 : 0.84;
    M_coreMat.uniforms.uBase.value.copy(M_baseC);
    M_coreMat.uniforms.uC1.value.copy(M_c1);
    M_coreMat.uniforms.uC2.value.copy(M_c2);
    M_coreMat.uniforms.uC3.value.copy(M_c3);

    // forms
    M_form.rails  = M_damp(M_form.rails,  ch.form.rails,  7.0, dt);
    M_form.coil   = M_damp(M_form.coil,   ch.form.coil,   7.0, dt);
    M_form.ribbon = M_damp(M_form.ribbon, ch.form.ribbon, 7.0, dt);

    M_rails.children.forEach((r,i)=> r.material.opacity = (0.10 + i*0.03 + M_overdrive*0.10) * M_form.rails);
    M_coil.material.opacity = (0.18 + M_overdrive*0.14) * M_form.coil;
    M_ribbon.material.opacity = (0.16 + M_overdrive*0.12) * M_form.ribbon;

    // burst lines
    M_fxBurstMat.opacity = (0.62 + M_overdrive*0.25) * M_fxBurstAmt;
    M_fxBurstLines.rotation.z = time * 0.35;

    // neon halo (visible)
    const haloOn = Math.max(M_neon, M_overdrive*0.55);
    M_haloMat.opacity = M_damp(M_haloMat.opacity, haloOn * (themeDark ? 0.85 : 0.65), 6.0, dt);
    const haloPulse = 1.0 + (M_fxPulse*0.10) + (M_overdrive*0.08);
    M_halo.scale.setScalar(5.2 * haloPulse);
    ring1.material.opacity = haloOn * (themeDark ? 0.30 : 0.22);
    ring2.material.opacity = haloOn * (themeDark ? 0.22 : 0.18);
    M_haloRings.rotation.y = time * (0.35 + haloOn*0.25);
    M_haloRings.rotation.z = -time * (0.20 + haloOn*0.20);

    // camera orbit
    const orbit = M_pSmooth * Math.PI * 1.85;
    const radius = 7.6 - Math.sin(M_pSmooth*Math.PI) * 1.5;

    const camX = Math.sin(orbit) * radius;
    const camZ = Math.cos(orbit) * radius;
    const camY = 0.24 + Math.sin(M_pSmooth*Math.PI) * 0.24;

    M_camera.position.x = M_damp(M_camera.position.x, camX, 3.6, dt);
    M_camera.position.z = M_damp(M_camera.position.z, camZ, 3.6, dt);
    M_camera.position.y = M_damp(M_camera.position.y, camY, 3.6, dt);
    M_camera.lookAt(0, 0.10, 0);

    // levitation
    const lev = Math.sin(time * 1.18 * M_floatSpeed) * (0.10 + M_overdrive*0.10);
    M_mascot.position.y = M_damp(M_mascot.position.y, lev, 7.5, dt);

    // spin kicks (start + return)
    M_spinKick = M_damp(M_spinKick, 0.0, 3.2, dt);

    // pointer steering
    const steerY = M_ptrNX * 0.35;
    const steerX = (-M_ptrNY) * 0.18;

    // drag inertia
    M_grabVX = M_damp(M_grabVX, 0.0, 2.1, dt);
    M_grabVY = M_damp(M_grabVY, 0.0, 2.1, dt);
    M_grabRotY += M_grabVX * (1.05 + M_overdrive*0.75);
    M_grabRotX += M_grabVY * (1.00 + M_overdrive*0.75);
    M_grabRotX = Math.max(-0.6, Math.min(0.6, M_grabRotX));

    const baseRotY = orbit * 0.85 + M_spinKick;
    const baseRotX = Math.sin(time*0.35)*0.08;

    M_mascot.rotation.y = M_damp(M_mascot.rotation.y, baseRotY + steerY + M_grabRotY*0.60, 6.0, dt);
    M_mascot.rotation.x = M_damp(M_mascot.rotation.x, baseRotX + steerX + M_grabRotX*0.60, 6.0, dt);

    // deco motion
    M_rails.rotation.y = -M_mascot.rotation.y * 0.9;
    M_rails.rotation.x = Math.sin(time*0.60) * (0.10 + M_overdrive*0.10) * M_form.rails;
    M_coil.rotation.y = time * (0.55 + M_overdrive*0.65);
    M_coil.rotation.x = time * (0.30 + M_overdrive*0.45);
    M_ribbon.rotation.y = -time * (0.25 + M_overdrive*0.35);

    // dust parallax
    M_dust.position.x = M_damp(M_dust.position.x, Math.sin(orbit)*0.16, 2.8, dt);
    M_dust.position.y = M_damp(M_dust.position.y, Math.sin(M_pSmooth*Math.PI)*0.10, 2.8, dt);

    // face follows pointer more strongly
    M_lookX = M_damp(M_lookX, M_ptrNX, 8.0, dt);
    M_lookY = M_damp(M_lookY, M_ptrNY, 8.0, dt);

    // face emotions
    M_mouthT = ch.face.mouth + M_overdrive*0.10;
    M_browT  = ch.face.brow  + M_overdrive*0.08;
    M_squintT= ch.face.squint + (M_grab*0.10);
    M_grinT  = ch.face.grin  + M_overdrive*0.14;

    M_mouthS = M_damp(M_mouthS, M_mouthT, 8.0, dt);
    M_browS  = M_damp(M_browS,  M_browT,  8.0, dt);
    M_squintS= M_damp(M_squintS, M_squintT, 10.0, dt);
    M_grinS  = M_damp(M_grinS,  M_grinT,  8.0, dt);

    M_mouth = M_mouthS; M_brow = M_browS; M_squint = M_squintS; M_grin = M_grinS;

    // blink
    M_blinkTimer += dt;
    if (M_blinkTimer > M_nextBlink){ M_blinkTimer = 0; M_nextBlink = 1.3 + Math.random()*2.6; }
    const bp = Math.min(1.0, M_blinkTimer / 0.14);
    const bc = (bp < 0.5) ? (bp/0.5) : (1.0 - (bp-0.5)/0.5);
    const blinkActive = M_blinkTimer < 0.14;
    const blinkTarget = blinkActive ? (1.0 - bc) : 0.0;
    M_blink = M_damp(M_blink, blinkTarget, 18.0, dt);

    M_drawFace();
    M_renderer.render(M_scene, M_camera);
  }

  function M_animLoop(){
    M_raf = requestAnimationFrame(M_animLoop);
    M_renderOnce();
  }
  function M_start(){
    if (M_running) return;
    M_running = true;
    M_lastT = performance.now();
    M_animLoop();
  }
  function M_stop(){
    M_running = false;
    cancelAnimationFrame(M_raf);
  }

  // Visible-only animation
  const M_io = new IntersectionObserver(([e])=>{
    if (!M_tourEnabled) return;
    if (e.isIntersecting) M_start();
    else M_stop();
  }, { threshold: 0.05 });
  M_io.observe(M_tour);

  window.addEventListener("scroll", ()=>{
    if (!M_tourEnabled) return;
    if (!M_running) M_renderOnce();
  }, { passive:true });

  // Start
  if (M_tourEnabled) M_start();

}
