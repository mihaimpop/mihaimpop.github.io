import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { CHAPTERS } from "../data/chapters.js";

export function initTourScene({
  root: M_root,
  canvas: M_canvas,
  tour: M_tour,
  tourToggle: M_tourToggle,
  caption: M_caption,
  headline: M_headline,
  subline: M_subline,
  scrollHint: M_scrollHint,
  reducedMotion: M_reducedMotion,
}) {
  // --------- Helpers
  const M_clamp01 = (x)=> Math.max(0, Math.min(1, x));
  const M_lerp = (a,b,t)=> a + (b-a)*t;
  const M_damp = (c,t,lambda,dt)=> M_lerp(c, t, 1 - Math.exp(-lambda * dt));
  const M_easeOutCubic = (x)=> 1 - Math.pow(1 - M_clamp01(x), 3);
  const M_rand = (a,b)=> M_lerp(a, b, Math.random());
  const M_ua = navigator.userAgent || "";
  const M_isFirefox = /firefox/i.test(M_ua);
  const M_isMobile = /android|iphone|ipad|ipod/i.test(M_ua)
    || window.matchMedia?.("(pointer: coarse)")?.matches;
  const M_quality = {
    maxDpr: M_isMobile ? 1.2 : (M_isFirefox ? 1.35 : 1.75),
    antialias: !(M_isMobile || M_isFirefox),
    coreDetail: M_isMobile ? 4 : (M_isFirefox ? 4 : 5),
    dustCount: M_isMobile ? 360 : (M_isFirefox ? 520 : 700),
    torusSegments: M_isMobile ? 72 : (M_isFirefox ? 84 : 96),
    coilTubular: M_isMobile ? 160 : (M_isFirefox ? 190 : 240),
    coilRadial: M_isMobile ? 14 : (M_isFirefox ? 16 : 18),
    ribbonSegments: M_isMobile ? 340 : (M_isFirefox ? 420 : 540),
    ringSegments: M_isMobile ? 72 : (M_isFirefox ? 80 : 96),
    faceSupersample: M_isMobile ? 1 : (M_isFirefox ? 1 : 2),
    faceFps: M_isMobile ? 30 : (M_isFirefox ? 36 : 60),
  };

  // --------- Tour enabled
  let M_tourEnabled = !M_reducedMotion;
  M_tourToggle.textContent = M_tourEnabled ? "Tour: ON" : "Tour: OFF";

  function M_tourIsVisible() {
    const r = M_tour.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  function M_scrollToExpress() {
    document.getElementById("express")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (location.hash === "#express") {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
  }

  function M_setCaptionCopy(headlineEl, sublineEl, chapter) {
    if (!headlineEl || !sublineEl || !chapter) return;
    headlineEl.textContent = chapter.h;
    sublineEl.innerHTML = `<span class="tag">${chapter.name}</span>${chapter.s}`;
  }

  function M_applyCaption(chapter) {
    M_setCaptionCopy(M_headline, M_subline, chapter);
  }

  let M_captionAnimToken = 0;
  function M_cancelCaptionTransition() {
    if (!M_caption) return;
    if (typeof M_caption.getAnimations === "function") {
      M_caption.getAnimations().forEach((anim)=> anim.cancel());
    }
    M_caption.style.opacity = "1";
    M_caption.style.transform = "translate3d(0,0,0)";
  }

  function M_swapCaption(chapter, direction = 1) {
    if (!M_caption || M_reducedMotion || typeof M_caption.animate !== "function") {
      M_cancelCaptionTransition();
      M_applyCaption(chapter);
      return;
    }

    const token = ++M_captionAnimToken;
    const dir = direction >= 0 ? 1 : -1;
    const outY = -dir * 10;
    const inY = dir * 10;
    M_cancelCaptionTransition();

    const outAnim = M_caption.animate(
      [
        { opacity: 1, transform: "translate3d(0,0,0)" },
        { opacity: 0, transform: `translate3d(0, ${outY}px, 0)` },
      ],
      { duration: 80, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }
    );

    outAnim.onfinish = ()=> {
      if (token !== M_captionAnimToken) return;
      M_applyCaption(chapter);

      const inAnim = M_caption.animate(
        [
          { opacity: 0, transform: `translate3d(0, ${inY}px, 0)` },
          { opacity: 1, transform: "translate3d(0,0,0)" },
        ],
        { duration: 150, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
      );
      inAnim.onfinish = ()=> {
        if (token !== M_captionAnimToken) return;
        M_caption.style.opacity = "1";
        M_caption.style.transform = "translate3d(0,0,0)";
      };
    };
  }

  // --------- Three setup
  const M_renderer = new THREE.WebGLRenderer({
    canvas: M_canvas,
    antialias: M_quality.antialias,
    alpha:true,
    powerPreference:"high-performance",
  });
  M_renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, M_quality.maxDpr));

  const M_scene = new THREE.Scene();
  const M_camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  M_camera.position.set(0, 0.25, 7.6);

  M_scene.add(new THREE.AmbientLight(0xffffff, 0.28));
  const M_keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
  M_keyLight.position.set(3.2, 4.2, 4.8);
  M_scene.add(M_keyLight);
  let M_targetScale = 1.0;
  let M_viewW = 0;
  let M_viewH = 0;
  let M_viewDpr = 0;

  function M_syncViewportSize(){
    const w = Math.max(1, Math.round(M_canvas.clientWidth || window.innerWidth || 1));
    const h = Math.max(1, Math.round(M_canvas.clientHeight || window.innerHeight || 1));
    const dpr = Math.min(window.devicePixelRatio || 1, M_quality.maxDpr);
    if (w === M_viewW && h === M_viewH && Math.abs(dpr - M_viewDpr) < 0.001) return;
    M_viewW = w;
    M_viewH = h;
    M_viewDpr = dpr;
    M_renderer.setPixelRatio(dpr);
    M_renderer.setSize(w, h, false);
    M_camera.aspect = w / h;
    M_camera.updateProjectionMatrix();
    M_targetScale = w <= 640 ? 0.84 : 1.0;
  }

  function M_handleResize(){
    M_syncViewportSize();
  }
  window.addEventListener("resize", M_handleResize, { passive:true });
  window.visualViewport?.addEventListener("resize", M_handleResize, { passive:true });
  window.visualViewport?.addEventListener("scroll", M_handleResize, { passive:true });
  M_handleResize();

  // --------- Scroll progress
  function M_rawScrollProgress(){
    const r = M_tour.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    const scrolled = -r.top;
    return M_clamp01(total <= 0 ? 0 : (scrolled / total));
  }

  // --------- Background dust
  const M_dustCount = M_quality.dustCount;
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
  const M_coreGeo = new THREE.IcosahedronGeometry(1.25, M_quality.coreDetail);

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

      vec3 safeNorm(vec3 v){
        return normalize(v + vec3(1e-5, 1e-5, 1e-5));
      }

      void main(){
        vec3 p = position;

        float t = uTime*0.38 + uP*2.0;

        float n1 = vnoise(p*1.55 + vec3(t, t*0.8, -t*0.45));
        float n2 = vnoise(p*3.10 + vec3(-t*0.6, t, t*0.65));
        float n = (n1*0.62 + n2*0.38);
        vN = n;

        float amp = uTurb * (1.0 + uOver*1.25);
        vec3 pN = safeNorm(p);
        vec3 displaced = p + pN * (n - 0.5) * amp;

        vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mv;

        vec3 vNrm = normalize(normalMatrix * pN);
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
  const M_wireMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent:true, opacity:0.24, depthWrite:false, toneMapped:false });
  const M_wire = new THREE.LineSegments(new THREE.WireframeGeometry(M_coreGeo), M_wireMat);
  M_wire.scale.setScalar(1.0025);
  M_wire.renderOrder = 20;
  M_core.add(M_wire);

  const M_mascot = new THREE.Group();
  M_mascot.rotation.order = "YXZ";
  M_mascot.add(M_core);
  M_scene.add(M_mascot);

  // Decorations
  function M_makeRing(r, y){
    const geo = new THREE.TorusGeometry(r, 0.02, 6, M_quality.torusSegments);
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
    new THREE.TorusKnotGeometry(1.08, 0.13, M_quality.coilTubular, M_quality.coilRadial, 2, 3),
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
    const geo = new THREE.TubeGeometry(curve, M_quality.ribbonSegments, 0.030, 10, true);
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
  const ringGeo = new THREE.RingGeometry(1.85, 1.92, M_quality.ringSegments);
  const ringMat = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.0, blending: THREE.AdditiveBlending, depthWrite:false });
  const ring1 = new THREE.Mesh(ringGeo, ringMat.clone());
  const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
  ring2.scale.setScalar(1.10);
  ring1.rotation.x = Math.PI/2;
  ring2.rotation.x = Math.PI/2;
  M_haloRings.add(ring1, ring2);
  M_mascot.add(M_haloRings);

  // Face sprite
  const M_faceSize = 256;
  const M_faceSupersample = M_quality.faceSupersample;
  const M_faceCanvas = document.createElement("canvas");
  M_faceCanvas.width = Math.round(M_faceSize * M_faceSupersample);
  M_faceCanvas.height = Math.round(M_faceSize * M_faceSupersample);
  const M_fctx = M_faceCanvas.getContext("2d");
  if (M_fctx) {
    M_fctx.imageSmoothingEnabled = true;
    M_fctx.imageSmoothingQuality = (M_isMobile || M_isFirefox) ? "medium" : "high";
  }
  const M_faceTex = new THREE.CanvasTexture(M_faceCanvas);
  M_faceTex.generateMipmaps = false;
  M_faceTex.minFilter = THREE.LinearFilter;
  M_faceTex.magFilter = THREE.LinearFilter;
  if ("colorSpace" in M_faceTex && "SRGBColorSpace" in THREE) M_faceTex.colorSpace = THREE.SRGBColorSpace;

  const M_faceMat = new THREE.SpriteMaterial({ map: M_faceTex, transparent:true, depthTest:false, depthWrite:false });
  const M_face = new THREE.Sprite(M_faceMat);
  M_face.scale.set(1.18, 1.18, 1.18);
  M_face.position.set(0, 0.07, 1.40);
  M_face.renderOrder = 999;
  M_mascot.add(M_face);

  // Face state
  let M_blink=0, M_blinkTimer=0, M_nextBlink=1.2 + Math.random()*2.2;
  let M_mouth=0.24, M_brow=0.06, M_lookX=0, M_lookY=0, M_squint=0, M_grin=0.25;
  let M_browTilt=0.03, M_mouthWidth=0.08, M_mouthY=-0.01, M_eyeWide=0.02, M_eyeGap=0.0;
  let M_browAsym=-0.02, M_browCurve=0.06;
  let M_eyeTilt=0.0, M_pupilSize=0.0, M_pupilLift=0.0;
  let M_mouthOpen=0.04, M_mouthSkew=0.06, M_mouthPinch=-0.03;
  let M_winkKick = 0;
  const M_faceFrameInterval = 1 / Math.max(1, M_quality.faceFps);
  let M_faceFrameAcc = M_faceFrameInterval;

  function M_drawFace(){
    const ctx = M_fctx;
    const w = M_faceSize;
    const h = M_faceSize;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, M_faceCanvas.width, M_faceCanvas.height);
    ctx.setTransform(M_faceSupersample, 0, 0, M_faceSupersample, 0, 0);

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.beginPath(); ctx.arc(w/2, h/2, 102, 0, Math.PI*2);
    ctx.fillStyle="#ffffff"; ctx.fill();
    ctx.restore();

    const eyeY = 106 + M_lookY*10;
    const eyeX = 78 + M_eyeGap*10;
    const px = M_lookX*12;
    const py = M_lookY*10 + M_pupilLift*3.5;
    const eyeOpenBase = Math.max(0.04, (1.0 + M_eyeWide*0.40) - M_blink - M_squint*0.48);
    const eyeOpenL = Math.max(0.04, eyeOpenBase - M_winkKick*0.92 - M_browAsym*0.08);
    const eyeOpenR = Math.max(0.04, eyeOpenBase - M_winkKick*0.18 + M_browAsym*0.08);
    const eyeRX = 22 + M_eyeWide*5;
    const eyeRY = 18 + M_eyeWide*3;
    const eyeTiltL = -M_eyeTilt * 0.24;
    const eyeTiltR = M_eyeTilt * 0.24;
    const pupilR = Math.max(3.8, 7 + M_pupilSize*2.8);

    function eye(cx, open, tilt){
      ctx.save();
      ctx.translate(cx, eyeY);
      ctx.rotate(tilt);
      ctx.scale(1, open);
      ctx.beginPath();
      ctx.ellipse(0,0,eyeRX,eyeRY,0,0,Math.PI*2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx + px, eyeY + py + tilt*5, pupilR, 0, Math.PI*2);
      ctx.fillStyle = "#0b0b10";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx + px - 3, eyeY + py - 3 + tilt*4, Math.max(1.6, pupilR*0.28), 0, Math.PI*2);
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.fill();
    }
    eye(w/2 - eyeX, eyeOpenL, eyeTiltL);
    eye(w/2 + eyeX, eyeOpenR, eyeTiltR);

    ctx.save();
    ctx.strokeStyle = "#0b0b10";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const browLift = M_brow * 16;
    function brow(cx, side){
      const asym = M_browAsym * side;
      const y = eyeY - 34 - browLift - asym*7;
      const tilt = (M_grin*4 + M_browTilt*12) * side;
      const arc = -8 - M_browCurve*8 + Math.abs(asym)*2;
      ctx.beginPath();
      ctx.moveTo(cx - 20, y + tilt*0.10);
      ctx.quadraticCurveTo(cx, y + arc, cx + 20, y + tilt);
      ctx.stroke();
    }
    brow(w/2-eyeX, -1);
    brow(w/2+eyeX, 1);
    ctx.restore();

    ctx.save();
    ctx.translate(w/2, 168 + M_mouthY*14);
    ctx.strokeStyle = "#0b0b10";
    ctx.lineWidth = 7.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const mouthOpen = Math.max(0.0, M_mouthOpen + M_overdrive*0.06);
    const mouthW = 35 * (1.0 + M_mouthWidth*0.36) * (1.0 - M_mouthPinch*0.22);
    const smile = (M_grin*12 + M_mouth*8) - mouthOpen*5;
    const skew = M_mouthSkew * 9;
    const upperY = -smile * 0.55;
    const lowerY = 7 + mouthOpen*18 + M_mouth*3;

    ctx.beginPath();
    ctx.moveTo(-mouthW, 0);
    ctx.quadraticCurveTo(skew, upperY, mouthW, 0);
    ctx.stroke();

    if (mouthOpen > 0.08){
      ctx.beginPath();
      ctx.moveTo(-mouthW*0.88, 2);
      ctx.quadraticCurveTo(skew, lowerY, mouthW*0.88, 2);
      ctx.stroke();

      ctx.save();
      ctx.globalAlpha = 0.12 + mouthOpen*0.20;
      ctx.fillStyle = "#0b0b10";
      ctx.beginPath();
      ctx.moveTo(-mouthW*0.86, 1);
      ctx.quadraticCurveTo(skew, upperY + 2, mouthW*0.86, 1);
      ctx.quadraticCurveTo(skew, lowerY - 2, -mouthW*0.86, 1);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    M_faceTex.needsUpdate = true;
  }

  // Chapters (more “you”, more personality on EXIT)
  const M_chapters = CHAPTERS;
  const M_lastChapterIdx = M_chapters.length - 1;
  let M_uiChapterIdx = 0;

  // FX + interaction state
  let M_lastKey = M_chapters[0].key;
  let M_lastUiChapterIdx = 0;
  let M_hasMountedChapterUI = false;
  let M_fxPulse = 0;
  let M_brandBurst = 0;
  let M_brandScaleKick = 0;

  let M_overdrive = 0.0;     // charged by hold
  let M_neon = 0.0;          // toggled by double tap
  let M_grab = 0.0;          // while dragging
  let M_grabRotX = 0.0;
  let M_grabRotY = 0.0;
  let M_inertiaRotX = 0.0;
  let M_inertiaRotY = 0.0;
  let M_fidgetRotX = 0.0;
  let M_fidgetRotY = 0.0;
  let M_fidgetFace = 0.0;
  let M_chPoseX = 0.0;
  let M_chPoseY = 0.0;
  const M_pitchLimit = 1.08;

  // one-time intro
  let M_introStarted = false;
  let M_introActive = false;
  let M_introT = 0.0;
  const M_introDur = 1.35;

  // pointer tracking (for face + orientation)
  let M_ptrNX = 0, M_ptrNY = 0;
  let M_lastPointerType = "mouse";
  let M_touchContact = false;
  let M_ptrRotX = 0, M_ptrRotY = 0;
  function M_isTouchLikePointer(e){
    return e?.pointerType === "touch" || e?.pointerType === "pen";
  }
  function M_setPointerFromEvent(e){
    const rect = M_canvas.getBoundingClientRect();
    const x = (("clientX" in e) ? e.clientX : (e.touches?.[0]?.clientX ?? rect.left + rect.width/2));
    const y = (("clientY" in e) ? e.clientY : (e.touches?.[0]?.clientY ?? rect.top + rect.height/2));
    const nx = ((x - rect.left) / rect.width) * 2 - 1;
    const ny = ((y - rect.top) / rect.height) * 2 - 1;
    M_ptrNX = Math.max(-1, Math.min(1, nx));
    M_ptrNY = Math.max(-1, Math.min(1, ny));
    M_lastPointerType = (typeof e.pointerType === "string" && e.pointerType)
      ? e.pointerType
      : (e.touches ? "touch" : "mouse");
  }
  function M_pointerTargets(){
    const touchLike = (M_lastPointerType === "touch" || M_lastPointerType === "pen");
    const recenterTouch = touchLike && !M_down && !M_touchContact && M_activePointerId === null;
    return {
      x: recenterTouch ? 0.0 : M_ptrNX,
      y: recenterTouch ? 0.0 : M_ptrNY,
      recenterTouch,
    };
  }

  // gesture tracking
  let M_down = false;
  let M_activePointerId = null;
  let M_downAt = 0;
  let M_downStartX = 0, M_downStartY = 0;
  let M_dragTravel = 0;
  let M_lastTapTime = 0;
  let M_lastX = 0, M_lastY = 0;
  let M_holdCharge = 0;
  let M_lastRotateInputAt = performance.now();
  const M_autoResetDelay = 2.8;
  const M_autoResetRamp = 1.4;
  const M_spinCarryThreshold = 0.055;
  const M_spinSettleThreshold = 0.022;

  function M_toggleNeon(){ M_neon = (M_neon > 0.5) ? 0.0 : 1.0; }
  function M_thump(){
    M_fxPulse = 1.0;
    M_root.style.setProperty("--pulse","1");
    setTimeout(()=> M_root.style.setProperty("--pulse","0"), 120);
  }
  function M_wink(){
    M_winkKick = 1.0;
  }
  function M_fidget(){
    const dir = Math.random() < 0.5 ? -1 : 1;
    M_fidgetRotY += 0.24 * dir;
    M_fidgetRotX += (Math.random()*0.14 - 0.07);
    M_fidgetFace = 1.0;
  }

  // Pointer events on canvas (mouse + touch)
  M_canvas.addEventListener("pointerdown", (e)=>{
    if (M_activePointerId !== null && e.pointerId !== M_activePointerId) return;
    M_activePointerId = e.pointerId;
    M_canvas.setPointerCapture?.(e.pointerId);
    M_down = true;
    M_downAt = performance.now();
    M_lastRotateInputAt = M_downAt;
    M_downStartX = e.clientX;
    M_downStartY = e.clientY;
    M_dragTravel = 0;
    M_holdCharge = 0;
    M_grab = 1.0;
    M_inertiaRotX = 0.0;
    M_inertiaRotY = 0.0;

    M_setPointerFromEvent(e);
    M_lastX = e.clientX; M_lastY = e.clientY;

    // tap reactions are handled on pointerup to avoid triggering during drags
  });

  M_canvas.addEventListener("pointermove", (e)=>{
    if (M_activePointerId !== null && e.pointerId !== M_activePointerId) return;
    M_setPointerFromEvent(e);

    if (M_down){
      const dx = (e.clientX - M_lastX);
      const dy = (e.clientY - M_lastY);
      if (Math.abs(dx) + Math.abs(dy) > 0.01){
        M_lastRotateInputAt = performance.now();
      }
      M_lastX = e.clientX; M_lastY = e.clientY;
      M_dragTravel = Math.max(M_dragTravel, Math.hypot(e.clientX - M_downStartX, e.clientY - M_downStartY));
      const touchYawBoost = e.pointerType === "touch" ? 2.1 : 1.0;
      const touchPitchBoost = e.pointerType === "touch" ? 1.25 : 1.0;

      // Earth-like control: strong yaw acceleration, stable/limited pitch.
      M_grabRotY += dx * (0.0078 * touchYawBoost);
      M_grabRotX += dy * (0.0042 * touchPitchBoost);

      // Capture residual angular velocity for release inertia.
      const impulseY = dx * (0.0046 * touchYawBoost);
      const impulseX = dy * (0.0018 * touchPitchBoost);
      M_inertiaRotY = M_lerp(M_inertiaRotY, impulseY, e.pointerType === "touch" ? 0.70 : 0.56);
      M_inertiaRotX = M_lerp(M_inertiaRotX, impulseX, e.pointerType === "touch" ? 0.62 : 0.50);
      M_inertiaRotY = Math.max(-0.42, Math.min(0.42, M_inertiaRotY));
      M_inertiaRotX = Math.max(-0.14, Math.min(0.14, M_inertiaRotX));

      // Soft-limit pitch so the face doesn't settle on the bottom hemisphere.
      const pitchOver = Math.abs(M_grabRotX) - M_pitchLimit;
      if (pitchOver > 0){
        M_grabRotX -= Math.sign(M_grabRotX) * pitchOver * 0.82;
        M_inertiaRotX *= 0.58;
      }
    }
  }, { passive:true });

  function M_endGrab(e, cancelTap = false){
    if (e && M_activePointerId !== null && e.pointerId !== M_activePointerId) return;
    if (M_isTouchLikePointer(e)) M_touchContact = false;
    if (M_activePointerId !== null && M_canvas.hasPointerCapture?.(M_activePointerId)) {
      M_canvas.releasePointerCapture?.(M_activePointerId);
    }
    M_activePointerId = null;
    const now = performance.now();
    const tap = !cancelTap && (now - M_downAt < 280) && (M_dragTravel < 14);
    M_down = false;
    M_grab = 0.0;

    if (tap){
      // Any tap winks; double tap still toggles neon.
      M_wink();
      if (now - M_lastTapTime < 320){
        M_toggleNeon();
        M_lastTapTime = 0;
        if (Math.random() < 0.3){
          M_fidget();
        }
      } else {
        M_lastTapTime = now;
        if (Math.random() < 0.5){
          M_fidget();
        }
      }
      M_thump();
    }

    // release causes thump if charged
    if (M_holdCharge > 0.25){
      M_thump();
    }
    if (M_dragTravel > 6){
      M_lastRotateInputAt = now;
    }
  }

  M_canvas.addEventListener("pointerup", (e)=> M_endGrab(e, false));
  M_canvas.addEventListener("pointercancel", (e)=> M_endGrab(e, true));
  M_canvas.addEventListener("lostpointercapture", (e)=>{
    if (e.pointerId === M_activePointerId || M_down) M_endGrab(e, true);
  });
  M_canvas.addEventListener("contextmenu", (e)=> e.preventDefault());
  window.addEventListener("blur", ()=> {
    M_touchContact = false;
    M_endGrab(null, true);
  });
  document.addEventListener("visibilitychange", ()=>{
    if (document.visibilityState !== "visible") {
      M_touchContact = false;
      M_endGrab(null, true);
    }
  });

  // follow pointer/touch even when not interacting
  window.addEventListener("pointerdown", (e)=> {
    if (M_isTouchLikePointer(e)) M_touchContact = true;
    M_setPointerFromEvent(e);
  }, { passive:true });
  window.addEventListener("pointermove", (e)=> {
    if (M_isTouchLikePointer(e)) M_touchContact = true;
    M_setPointerFromEvent(e);
  }, { passive:true });
  window.addEventListener("pointerup", (e)=> {
    if (M_isTouchLikePointer(e)) M_touchContact = false;
  }, { passive:true });
  window.addEventListener("pointercancel", (e)=> {
    if (M_isTouchLikePointer(e)) M_touchContact = false;
  }, { passive:true });
  // Fallback for browsers/environments that throttle pointer events during touch scrolling.
  window.addEventListener("touchstart", (e)=> {
    M_touchContact = e.touches.length > 0;
    M_setPointerFromEvent(e);
  }, { passive:true });
  window.addEventListener("touchmove", (e)=> {
    M_touchContact = e.touches.length > 0;
    M_setPointerFromEvent(e);
  }, { passive:true });
  window.addEventListener("touchend", (e)=> {
    M_touchContact = e.touches.length > 0;
  }, { passive:true });
  window.addEventListener("touchcancel", ()=> {
    M_touchContact = false;
  }, { passive:true });

  function M_setTourEnabled(enabled, { scrollExpress = false } = {}) {
    M_tourEnabled = enabled;
    M_tourToggle.textContent = M_tourEnabled ? "Tour: ON" : "Tour: OFF";
    if (M_scrollHint && !M_tourEnabled) {
      M_scrollHint.style.opacity = "0";
    }
    if (!M_tourEnabled) {
      M_stop();
      if (scrollExpress) M_scrollToExpress();
      M_renderOnce();
      return;
    }
    M_renderOnce();
    if (M_tourIsVisible()) M_start();
  }

  function M_triggerBrandRefresh() {
    if (!M_reducedMotion && !M_tourEnabled) {
      M_setTourEnabled(true);
    }

    window.scrollTo({ top: 0, behavior: M_reducedMotion ? "auto" : "smooth" });
    if (location.hash === "#express") {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }

    M_fxPulse = 1.0;
    M_brandBurst = 1.0;
    M_brandScaleKick = 1.0;
    M_holdCharge = Math.max(M_holdCharge, 0.72);
    M_inertiaRotY = Math.max(M_inertiaRotY, 0.18);
    M_grabRotY += 0.26;
    M_lastRotateInputAt = performance.now();
    M_wink();
    M_fidget();

    if (M_tourIsVisible()) M_start();
    else M_renderOnce();
  }

  // Tour toggle (no peek mode, no layout jump)
  M_tourToggle.addEventListener("click", ()=>{
    const nextEnabled = !M_tourEnabled;
    M_setTourEnabled(nextEnabled, { scrollExpress: !nextEnabled });
  });

  // --------- Render loop
  let M_running = false;
  let M_raf = 0;
  let M_lastT = performance.now();

  let M_pSmooth = 0;
  let M_turbSmooth = 0.10;
  let M_floatSpeed = 1.0;
  let M_wireDarkMode = false;

  const M_form = { rails:0, coil:0, ribbon:0 };
  const M_baseC = new THREE.Color(), M_c1 = new THREE.Color(), M_c2 = new THREE.Color(), M_c3 = new THREE.Color();

  // face smoothing
  let M_mouthT=0.24, M_browT=0.06, M_squintT=0.0, M_grinT=0.25;
  let M_mouthS=0.24, M_browS=0.06, M_squintS=0.0, M_grinS=0.25;
  let M_browTiltT=0.03, M_mouthWidthT=0.08, M_mouthYT=-0.01, M_eyeWideT=0.02, M_eyeGapT=0.0;
  let M_browTiltS=0.03, M_mouthWidthS=0.08, M_mouthYS=-0.01, M_eyeWideS=0.02, M_eyeGapS=0.0;
  let M_browAsymT=-0.02, M_browCurveT=0.06, M_eyeTiltT=0.0, M_pupilSizeT=0.0, M_pupilLiftT=0.0;
  let M_mouthOpenT=0.04, M_mouthSkewT=0.06, M_mouthPinchT=-0.03;
  let M_browAsymS=-0.02, M_browCurveS=0.06, M_eyeTiltS=0.0, M_pupilSizeS=0.0, M_pupilLiftS=0.0;
  let M_mouthOpenS=0.04, M_mouthSkewS=0.06, M_mouthPinchS=-0.03;
  const M_idleModes = ["smile", "brow", "smug", "smile"];
  let M_idleModeIdx = 0;
  let M_idleMode = M_idleModes[0];
  let M_idleModeT = 0.0;
  let M_idleModeDur = 2.8;
  let M_idleSmugSign = 1;
  let M_idleSmile = 1.0;
  let M_idleBrow = 0.0;
  let M_idleSmug = 0.0;

  const M_moodTemplate = {
    mouth:0, brow:0, squint:0, grin:0,
    browTilt:0, mouthWidth:0, mouthY:0, eyeWide:0, eyeGap:0,
    browAsym:0, browCurve:0, eyeTilt:0, pupilSize:0, pupilLift:0,
    mouthOpen:0, mouthSkew:0, mouthPinch:0,
    lookX:0, lookY:0,
  };
  const M_moodState = {
    timer: 0.0,
    dur: 2.2,
    target: { ...M_moodTemplate },
    smooth: { ...M_moodTemplate },
  };

  function M_setMoodTargets(next){
    const tgt = M_moodState.target;
    tgt.mouth = next.mouth ?? 0;
    tgt.brow = next.brow ?? 0;
    tgt.squint = next.squint ?? 0;
    tgt.grin = next.grin ?? 0;
    tgt.browTilt = next.browTilt ?? 0;
    tgt.mouthWidth = next.mouthWidth ?? 0;
    tgt.mouthY = next.mouthY ?? 0;
    tgt.eyeWide = next.eyeWide ?? 0;
    tgt.eyeGap = next.eyeGap ?? 0;
    tgt.browAsym = next.browAsym ?? 0;
    tgt.browCurve = next.browCurve ?? 0;
    tgt.eyeTilt = next.eyeTilt ?? 0;
    tgt.pupilSize = next.pupilSize ?? 0;
    tgt.pupilLift = next.pupilLift ?? 0;
    tgt.mouthOpen = next.mouthOpen ?? 0;
    tgt.mouthSkew = next.mouthSkew ?? 0;
    tgt.mouthPinch = next.mouthPinch ?? 0;
    tgt.lookX = next.lookX ?? 0;
    tgt.lookY = next.lookY ?? 0;
  }

  function M_pickMood(){
    const side = Math.random() < 0.5 ? -1 : 1;
    const amp = M_rand(0.82, 1.24);
    const roll = Math.random();
    const next = {};
    let durMin = 1.2;
    let durMax = 2.6;

    if (roll < 0.22){
      // Thoughtful / problem-solving.
      next.brow = 0.16 * amp;
      next.squint = 0.08 * amp;
      next.browTilt = 0.12 * side * amp;
      next.browAsym = 0.15 * side * amp;
      next.browCurve = 0.06 * amp;
      next.mouthPinch = 0.16 * amp;
      next.mouthSkew = -0.08 * side * amp;
      next.pupilLift = 0.07 * amp;
      next.eyeTilt = 0.05 * side * amp;
      next.lookX = -0.20 * side * amp;
      next.lookY = -0.10 * amp;
      durMin = 1.8; durMax = 3.2;
    } else if (roll < 0.42){
      // "Remembered a joke."
      next.mouth = 0.20 * amp;
      next.grin = 0.24 * amp;
      next.mouthOpen = 0.12 * amp;
      next.mouthSkew = 0.16 * side * amp;
      next.brow = 0.10 * amp;
      next.browCurve = 0.14 * amp;
      next.eyeWide = 0.10 * amp;
      next.pupilSize = 0.08 * amp;
      next.lookX = 0.12 * side * amp;
      next.lookY = -0.06 * amp;
      durMin = 1.4; durMax = 2.6;
    } else if (roll < 0.58){
      // Brief frown / skepticism.
      next.mouth = -0.22 * amp;
      next.grin = -0.18 * amp;
      next.brow = -0.14 * amp;
      next.squint = 0.11 * amp;
      next.browCurve = -0.18 * amp;
      next.mouthPinch = 0.18 * amp;
      next.mouthY = 0.04 * amp;
      next.mouthOpen = -0.06 * amp;
      next.eyeTilt = 0.04 * side * amp;
      next.lookY = 0.08 * amp;
      durMin = 1.2; durMax = 2.1;
    } else if (roll < 0.76){
      // Curiosity / eyebrow raise.
      next.brow = 0.17 * amp;
      next.browAsym = 0.22 * side * amp;
      next.browTilt = 0.16 * side * amp;
      next.browCurve = 0.09 * amp;
      next.eyeWide = 0.08 * amp;
      next.mouthSkew = 0.08 * side * amp;
      next.mouth = 0.05 * amp;
      next.lookX = 0.18 * side * amp;
      next.pupilLift = 0.03 * amp;
      durMin = 1.0; durMax = 1.9;
    } else if (roll < 0.90){
      // Smug micro-smirk.
      next.mouth = 0.08 * amp;
      next.grin = 0.18 * amp;
      next.squint = 0.07 * amp;
      next.mouthSkew = 0.18 * side * amp;
      next.mouthPinch = 0.10 * amp;
      next.eyeTilt = 0.09 * side * amp;
      next.pupilSize = 0.05 * amp;
      next.browAsym = -0.10 * side * amp;
      next.lookX = 0.12 * side * amp;
      next.lookY = -0.04 * amp;
      durMin = 1.4; durMax = 2.4;
    } else {
      // Neutral drift, still alive.
      next.mouth = M_rand(-0.04, 0.06);
      next.brow = M_rand(-0.03, 0.05);
      next.squint = M_rand(0.00, 0.04);
      next.grin = M_rand(-0.02, 0.08);
      next.mouthOpen = M_rand(-0.02, 0.04);
      next.pupilLift = M_rand(-0.03, 0.03);
      next.lookX = M_rand(-0.08, 0.08);
      next.lookY = M_rand(-0.06, 0.06);
      durMin = 1.1; durMax = 2.6;
    }

    next.eyeGap = (next.eyeGap ?? 0) + M_rand(-0.03, 0.03);
    next.mouthWidth = (next.mouthWidth ?? 0) + M_rand(-0.04, 0.04);
    if (Math.random() < 0.18){
      next.lookX = (next.lookX ?? 0) + M_rand(-0.14, 0.14);
      next.lookY = (next.lookY ?? 0) + M_rand(-0.10, 0.10);
    }

    M_setMoodTargets(next);
    M_moodState.timer = 0.0;
    M_moodState.dur = M_rand(durMin, durMax);
  }

  M_pickMood();

  function M_renderOnce(){
    const now = performance.now();
    const dt = Math.min(0.05, (now - M_lastT)/1000);
    M_lastT = now;
    const time = now * 0.001;

    const themeDark = (M_root.dataset.theme === "dark");

    // wire color / contrast
    const wirePulse = 0.5 + 0.5 * Math.sin(time * 1.35 + M_pSmooth * 6.2);
    if (themeDark){
      M_wireMat.color.setRGB(0.86, 0.94, 1.0);
      M_wireMat.opacity = 0.34 + M_overdrive*0.16 + M_fxPulse*0.12 + wirePulse*0.05;
      M_wire.scale.setScalar(1.0068);
    } else {
      M_wireMat.color.setHex(0x040508);
      M_wireMat.opacity = 0.18 + M_overdrive*0.04;
      M_wire.scale.setScalar(1.0032);
    }
    if (themeDark !== M_wireDarkMode) {
      M_wireDarkMode = themeDark;
      M_wireMat.depthTest = !themeDark;
      M_wireMat.blending = themeDark ? THREE.AdditiveBlending : THREE.NormalBlending;
      M_wireMat.needsUpdate = true;
    }

    // decay FX
    M_fxPulse = M_damp(M_fxPulse, 0.0, 10.0, dt);
    M_brandBurst = M_damp(M_brandBurst, 0.0, 3.8, dt);
    M_brandScaleKick = M_damp(M_brandScaleKick, 0.0, 7.2, dt);
    M_winkKick = M_damp(M_winkKick, 0.0, 10.0, dt);
    M_fidgetFace = M_damp(M_fidgetFace, 0.0, 9.0, dt);
    M_fidgetRotX = M_damp(M_fidgetRotX, 0.0, 9.0, dt);
    M_fidgetRotY = M_damp(M_fidgetRotY, 0.0, 9.0, dt);

    // Idle cycle: smile -> eyebrow raise -> smug -> smile ...
    if (!M_down && !M_introActive){
      M_idleModeT += dt;
      if (M_idleModeT >= M_idleModeDur){
        M_idleModeIdx = (M_idleModeIdx + 1) % M_idleModes.length;
        M_idleMode = M_idleModes[M_idleModeIdx];
        M_idleModeT = 0.0;
        if (M_idleMode === "smile") M_idleModeDur = 2.4 + Math.random()*2.0;
        if (M_idleMode === "brow") M_idleModeDur = 0.8 + Math.random()*0.7;
        if (M_idleMode === "smug") {
          M_idleModeDur = 1.6 + Math.random()*1.4;
          M_idleSmugSign = Math.random() < 0.5 ? -1 : 1;
        }
      }
    }
    const idleSmileTarget = M_idleMode === "smile" ? 1.0 : 0.36;
    const idleBrowTarget = M_idleMode === "brow" ? 1.0 : 0.0;
    const idleSmugTarget = M_idleMode === "smug" ? 1.0 : 0.0;
    M_idleSmile = M_damp(M_idleSmile, idleSmileTarget, 2.2, dt);
    M_idleBrow = M_damp(M_idleBrow, idleBrowTarget, 3.8, dt);
    M_idleSmug = M_damp(M_idleSmug, idleSmugTarget, 2.8, dt);

    // Randomized micro-expressions with smooth transitions.
    M_moodState.timer += dt;
    if (M_moodState.timer >= M_moodState.dur){
      M_pickMood();
    }
    const moodTarget = M_moodState.target;
    const moodSmooth = M_moodState.smooth;
    const moodLambda = M_down ? 2.6 : 3.4;
    moodSmooth.mouth = M_damp(moodSmooth.mouth, moodTarget.mouth, moodLambda, dt);
    moodSmooth.brow = M_damp(moodSmooth.brow, moodTarget.brow, moodLambda, dt);
    moodSmooth.squint = M_damp(moodSmooth.squint, moodTarget.squint, moodLambda, dt);
    moodSmooth.grin = M_damp(moodSmooth.grin, moodTarget.grin, moodLambda, dt);
    moodSmooth.browTilt = M_damp(moodSmooth.browTilt, moodTarget.browTilt, moodLambda, dt);
    moodSmooth.mouthWidth = M_damp(moodSmooth.mouthWidth, moodTarget.mouthWidth, moodLambda, dt);
    moodSmooth.mouthY = M_damp(moodSmooth.mouthY, moodTarget.mouthY, moodLambda, dt);
    moodSmooth.eyeWide = M_damp(moodSmooth.eyeWide, moodTarget.eyeWide, moodLambda, dt);
    moodSmooth.eyeGap = M_damp(moodSmooth.eyeGap, moodTarget.eyeGap, moodLambda, dt);
    moodSmooth.browAsym = M_damp(moodSmooth.browAsym, moodTarget.browAsym, moodLambda, dt);
    moodSmooth.browCurve = M_damp(moodSmooth.browCurve, moodTarget.browCurve, moodLambda, dt);
    moodSmooth.eyeTilt = M_damp(moodSmooth.eyeTilt, moodTarget.eyeTilt, moodLambda, dt);
    moodSmooth.pupilSize = M_damp(moodSmooth.pupilSize, moodTarget.pupilSize, moodLambda, dt);
    moodSmooth.pupilLift = M_damp(moodSmooth.pupilLift, moodTarget.pupilLift, moodLambda, dt);
    moodSmooth.mouthOpen = M_damp(moodSmooth.mouthOpen, moodTarget.mouthOpen, moodLambda, dt);
    moodSmooth.mouthSkew = M_damp(moodSmooth.mouthSkew, moodTarget.mouthSkew, moodLambda, dt);
    moodSmooth.mouthPinch = M_damp(moodSmooth.mouthPinch, moodTarget.mouthPinch, moodLambda, dt);
    moodSmooth.lookX = M_damp(moodSmooth.lookX, moodTarget.lookX, moodLambda, dt);
    moodSmooth.lookY = M_damp(moodSmooth.lookY, moodTarget.lookY, moodLambda, dt);

    // scroll
    const pRaw = M_rawScrollProgress();
    M_pSmooth = M_damp(M_pSmooth, pRaw, 10.0, dt);
    if (M_scrollHint) {
      const hintOpacity = M_tourEnabled ? M_clamp01((0.15 - M_pSmooth) / 0.15) : 0;
      M_scrollHint.style.opacity = `${hintOpacity}`;
      M_scrollHint.style.transform = `translateY(${(1 - hintOpacity) * 10}px)`;
    }

    let blendIdx = 0;
    while (blendIdx < M_lastChapterIdx && M_pSmooth >= M_chapters[blendIdx + 1].t){
      blendIdx += 1;
    }
    const chA = M_chapters[blendIdx];
    const chB = M_chapters[Math.min(blendIdx + 1, M_lastChapterIdx)];
    const blendSpan = Math.max(0.0001, chB.t - chA.t);
    const blendRaw = blendIdx === M_lastChapterIdx ? 0 : M_clamp01((M_pSmooth - chA.t) / blendSpan);
    const blendT = blendRaw * blendRaw * (3.0 - 2.0 * blendRaw);

    if (blendIdx === M_lastChapterIdx) {
      M_uiChapterIdx = M_lastChapterIdx;
    } else {
      const nextIdx = blendIdx + 1;

      // Keep copy changes in phase with the same blend that drives mascot visuals.
      if (M_uiChapterIdx < blendIdx || M_uiChapterIdx > nextIdx) {
        M_uiChapterIdx = blendT >= 0.5 ? nextIdx : blendIdx;
      } else if (M_uiChapterIdx === blendIdx && blendT >= 0.52) {
        M_uiChapterIdx = nextIdx;
      } else if (M_uiChapterIdx === nextIdx && blendT <= 0.48) {
        M_uiChapterIdx = blendIdx;
      }
    }

    const chUI = M_chapters[M_uiChapterIdx];
    if (!M_hasMountedChapterUI || chUI.key !== M_lastKey){
      const didChange = M_hasMountedChapterUI && chUI.key !== M_lastKey;
      const prevChapterIdx = M_lastUiChapterIdx;
      M_lastKey = chUI.key;
      M_lastUiChapterIdx = M_uiChapterIdx;
      if (didChange) {
        const direction = M_uiChapterIdx >= prevChapterIdx ? 1 : -1;
        M_swapCaption(chUI, direction);
      } else {
        M_cancelCaptionTransition();
        M_applyCaption(chUI);
      }
      M_hasMountedChapterUI = true;
      if (didChange) {
        M_thump();
      }
    }

    // hold charge -> overdrive
    if (M_down){
      M_holdCharge = Math.min(1, M_holdCharge + dt * 0.65);
    } else {
      M_holdCharge = Math.max(0, M_holdCharge - dt * 0.85);
    }
    const M_overdriveTarget = Math.max(M_holdCharge, M_brandBurst * 0.55);
    M_overdrive = M_damp(M_overdrive, M_overdriveTarget, 8.0, dt);

    // motion
    const motTurb = M_lerp(chA.mot.turb, chB.mot.turb, blendT);
    const motFlo = M_lerp(chA.mot.flo, chB.mot.flo, blendT);
    M_turbSmooth = M_damp(M_turbSmooth, motTurb * (1.0 + M_overdrive*1.35), 5.0, dt);
    M_floatSpeed = M_damp(M_floatSpeed, motFlo * (1.0 + M_overdrive*0.9), 4.5, dt);

    // palette
    const pa = chA.pal;
    const pb = chB.pal;
    M_baseC.setRGB(
      M_lerp(pa.base[0], pb.base[0], blendT),
      M_lerp(pa.base[1], pb.base[1], blendT),
      M_lerp(pa.base[2], pb.base[2], blendT),
    );
    M_c1.setRGB(
      M_lerp(pa.c1[0], pb.c1[0], blendT),
      M_lerp(pa.c1[1], pb.c1[1], blendT),
      M_lerp(pa.c1[2], pb.c1[2], blendT),
    );
    M_c2.setRGB(
      M_lerp(pa.c2[0], pb.c2[0], blendT),
      M_lerp(pa.c2[1], pb.c2[1], blendT),
      M_lerp(pa.c2[2], pb.c2[2], blendT),
    );
    M_c3.setRGB(
      M_lerp(pa.c3[0], pb.c3[0], blendT),
      M_lerp(pa.c3[1], pb.c3[1], blendT),
      M_lerp(pa.c3[2], pb.c3[2], blendT),
    );

    M_coreMat.uniforms.uTime.value = time;
    M_coreMat.uniforms.uP.value = M_pSmooth;
    M_coreMat.uniforms.uTurb.value = M_turbSmooth;
    M_coreMat.uniforms.uOver.value = M_overdrive;
    M_coreMat.uniforms.uPulse.value = M_fxPulse;

    M_coreMat.uniforms.uMix.value = themeDark ? 0.86 : 0.92;
    M_coreMat.uniforms.uBase.value.copy(M_baseC);
    M_coreMat.uniforms.uC1.value.copy(M_c1);
    M_coreMat.uniforms.uC2.value.copy(M_c2);
    M_coreMat.uniforms.uC3.value.copy(M_c3);

    // forms
    const formRails = M_lerp(chA.form.rails, chB.form.rails, blendT);
    const formCoil = M_lerp(chA.form.coil, chB.form.coil, blendT);
    const formRibbon = M_lerp(chA.form.ribbon, chB.form.ribbon, blendT);
    M_form.rails  = M_damp(M_form.rails, formRails, 7.0, dt);
    M_form.coil   = M_damp(M_form.coil, formCoil, 7.0, dt);
    M_form.ribbon = M_damp(M_form.ribbon, formRibbon, 7.0, dt);

    M_rails.children.forEach((r,i)=> r.material.opacity = (0.10 + i*0.03 + M_overdrive*0.10) * M_form.rails);
    M_coil.material.opacity = (0.18 + M_overdrive*0.14) * M_form.coil;
    M_ribbon.material.opacity = (0.16 + M_overdrive*0.12) * M_form.ribbon;

    // neon halo (visible)
    const haloOn = Math.max(M_neon, M_overdrive*0.55, M_brandBurst * 0.65);
    M_haloMat.opacity = M_damp(M_haloMat.opacity, haloOn * (themeDark ? 0.85 : 0.65), 6.0, dt);
    const haloPulse = 1.0 + (M_fxPulse*0.10) + (M_overdrive*0.08) + (M_brandBurst * 0.12);
    M_halo.scale.setScalar(5.2 * haloPulse);
    ring1.material.opacity = haloOn * (themeDark ? 0.30 : 0.22);
    ring2.material.opacity = haloOn * (themeDark ? 0.22 : 0.18);
    M_haloRings.rotation.y = time * (0.35 + haloOn*0.25);
    M_haloRings.rotation.z = -time * (0.20 + haloOn*0.20);

    // Keep a frontal camera on scroll so the mascot does not appear to rotate.
    const scrollWave = Math.sin(M_pSmooth * Math.PI);
    const camX = 0.0;
    const camJitter = Math.sin(time * 24.0) * (M_brandBurst * 0.05);
    const camZ = 7.6 - scrollWave * 1.5 - camJitter * 0.45;
    const camY = 0.24 + scrollWave * 0.24 + camJitter;

    M_camera.position.x = M_damp(M_camera.position.x, camX, 3.6, dt);
    M_camera.position.z = M_damp(M_camera.position.z, camZ, 3.6, dt);
    M_camera.position.y = M_damp(M_camera.position.y, camY, 3.6, dt);
    M_camera.lookAt(0, 0.10, 0);

    // chapter pose targets (smooth, no twitch on chapter switches)
    const poseYTarget = M_lerp(chA.face.poseY ?? 0, chB.face.poseY ?? 0, blendT);
    const poseXTarget = M_lerp(chA.face.poseX ?? 0, chB.face.poseX ?? 0, blendT);
    M_chPoseY = M_damp(M_chPoseY, poseYTarget, 6.0, dt);
    M_chPoseX = M_damp(M_chPoseX, poseXTarget, 6.0, dt);

    let introLift = 0.0;
    let introDepth = 0.0;
    let introSpin = 0.0;
    let introScale = 1.0;
    if (M_introActive){
      M_introT += dt;
      const ip = M_clamp01(M_introT / M_introDur);
      const ie = M_easeOutCubic(ip);
      const rem = 1.0 - ie;
      introLift = rem * 1.15;
      introDepth = -rem * 3.0;
      introSpin = rem * (Math.PI * 2.0);
      introScale = 0.74 + ie * 0.26;
      if (ip >= 1.0){
        M_introActive = false;
      }
    }

    // levitation
    const lev = Math.sin(time * 1.18 * M_floatSpeed) * (0.10 + M_overdrive*0.10);
    M_mascot.position.y = M_damp(M_mascot.position.y, lev + introLift, 7.5, dt);
    M_mascot.position.z = M_damp(M_mascot.position.z, introDepth, 7.5, dt);
    const brandScale = 1.0 + M_brandScaleKick * 0.08 + Math.sin(time * 22.0) * (M_brandBurst * 0.03);
    const mascotScale = M_damp(M_mascot.scale.x, M_targetScale * introScale * brandScale, 7.5, dt);
    M_mascot.scale.setScalar(mascotScale);
    const ptrTargets = M_pointerTargets();

    // Drag/swipe controls orientation with inertia.
    if (!M_down){
      const frameScale = dt * 60.0;
      M_grabRotY += M_inertiaRotY * frameScale;
      M_grabRotX += M_inertiaRotX * frameScale;
    }
    const spinSpeed = Math.hypot(M_inertiaRotY, M_inertiaRotX);
    const releaseLambda = M_down ? 14.0 : M_lerp(0.95, 0.18, M_clamp01(spinSpeed / 0.22));
    M_inertiaRotY = M_damp(M_inertiaRotY, 0.0, releaseLambda, dt);
    M_inertiaRotX = M_damp(M_inertiaRotX, 0.0, releaseLambda * 1.35, dt);
    if (!M_down && spinSpeed > M_spinCarryThreshold){
      M_lastRotateInputAt = now;
    }

    const pitchOver = Math.abs(M_grabRotX) - M_pitchLimit;
    if (pitchOver > 0){
      M_grabRotX -= Math.sign(M_grabRotX) * pitchOver * 0.72;
      M_inertiaRotX *= 0.55;
    }

    // Return manual drag offsets to the initial orientation after idle time.
    if (!M_down && spinSpeed < M_spinSettleThreshold){
      const rotateIdleSec = (now - M_lastRotateInputAt) * 0.001;
      if (rotateIdleSec > M_autoResetDelay){
        const autoT = M_clamp01((rotateIdleSec - M_autoResetDelay) / M_autoResetRamp);
        const autoYawLambda = M_lerp(0.0, 2.8, autoT);
        const autoPitchLambda = M_lerp(0.0, 3.3, autoT);
        M_grabRotY = M_damp(M_grabRotY, 0.0, autoYawLambda, dt);
        M_grabRotX = M_damp(M_grabRotX, 0.0, autoPitchLambda, dt);
        const autoInertiaLambda = M_lerp(1.8, 6.0, autoT);
        M_inertiaRotY = M_damp(M_inertiaRotY, 0.0, autoInertiaLambda, dt);
        M_inertiaRotX = M_damp(M_inertiaRotX, 0.0, autoInertiaLambda * 1.15, dt);
      }
    }

    const ptrYawTarget = ptrTargets.x * (M_down ? 0.16 : 0.24);
    const ptrPitchTarget = ptrTargets.y * (M_down ? 0.10 : 0.15);
    const ptrLambda = ptrTargets.recenterTouch ? 5.5 : 10.0;
    M_ptrRotY = M_damp(M_ptrRotY, ptrYawTarget, ptrLambda, dt);
    M_ptrRotX = M_damp(M_ptrRotX, ptrPitchTarget, ptrLambda, dt);

    const rotYTarget = M_grabRotY + M_ptrRotY + M_chPoseY + introSpin + M_fidgetRotY;
    const rotXTarget = M_grabRotX + M_ptrRotX + M_chPoseX + M_fidgetRotX;
    const rotLambda = M_introActive ? 14.0 : 11.0;
    M_mascot.rotation.y = M_damp(M_mascot.rotation.y, rotYTarget, rotLambda, dt);
    M_mascot.rotation.x = M_damp(M_mascot.rotation.x, rotXTarget, rotLambda, dt);

    // deco motion
    M_rails.rotation.y = -M_mascot.rotation.y * 0.9;
    M_rails.rotation.x = Math.sin(time*0.60) * (0.10 + M_overdrive*0.10) * M_form.rails;
    M_coil.rotation.y = time * (0.55 + M_overdrive*0.65);
    M_coil.rotation.x = time * (0.30 + M_overdrive*0.45);
    M_ribbon.rotation.y = -time * (0.25 + M_overdrive*0.35);

    // dust parallax
    M_dust.position.x = M_damp(M_dust.position.x, 0.0, 2.8, dt);
    M_dust.position.y = M_damp(M_dust.position.y, scrollWave * 0.10, 2.8, dt);

    // face follows pointer plus subtle thought drift.
    const moodLookScale = M_down ? 0.42 : 0.72;
    const lookXTarget = Math.max(-1, Math.min(1, ptrTargets.x + moodSmooth.lookX * moodLookScale));
    const lookYTarget = Math.max(-1, Math.min(1, ptrTargets.y + moodSmooth.lookY * moodLookScale));
    M_lookX = M_damp(M_lookX, lookXTarget, 8.0, dt);
    M_lookY = M_damp(M_lookY, lookYTarget, 8.0, dt);

    // face emotions
    const idleSmileAmt = M_idleSmile * 0.11;
    const idleBrowAmt = M_idleBrow * 0.24;
    const idleSmugAmt = M_idleSmug * (0.72 + 0.28 * Math.sin(time * 3.6));
    const idleSmugDir = M_idleSmugSign;

    M_mouthT = M_lerp(chA.face.mouth, chB.face.mouth, blendT) + M_overdrive*0.10 + idleSmileAmt*0.12 + idleSmugAmt*0.08 + moodSmooth.mouth;
    M_browT  = M_lerp(chA.face.brow, chB.face.brow, blendT) + M_overdrive*0.08 + idleBrowAmt + moodSmooth.brow;
    M_squintT= M_lerp(chA.face.squint, chB.face.squint, blendT) + (M_grab*0.10) + idleSmugAmt*0.16 + moodSmooth.squint;
    M_grinT  = M_lerp(chA.face.grin, chB.face.grin, blendT) + M_overdrive*0.14 + idleSmileAmt + idleSmugAmt*0.22 + moodSmooth.grin;
    M_browTiltT = M_lerp(chA.face.browTilt ?? 0, chB.face.browTilt ?? 0, blendT) + idleSmugAmt*0.18*idleSmugDir + idleBrowAmt*0.04 + moodSmooth.browTilt;
    M_mouthWidthT = M_lerp(chA.face.mouthWidth ?? 0, chB.face.mouthWidth ?? 0, blendT) + idleSmugAmt*0.08 + moodSmooth.mouthWidth;
    M_mouthYT = M_lerp(chA.face.mouthY ?? 0, chB.face.mouthY ?? 0, blendT) - idleSmileAmt*0.02 + moodSmooth.mouthY;
    M_eyeWideT = M_lerp(chA.face.eyeWide ?? 0, chB.face.eyeWide ?? 0, blendT) + idleBrowAmt*0.16 + M_fidgetFace*0.09 + moodSmooth.eyeWide;
    M_eyeGapT = M_lerp(chA.face.eyeGap ?? 0, chB.face.eyeGap ?? 0, blendT) + moodSmooth.eyeGap;
    M_browAsymT = M_lerp(chA.face.browAsym ?? 0, chB.face.browAsym ?? 0, blendT) + idleSmugAmt*0.10*idleSmugDir + moodSmooth.browAsym;
    M_browCurveT = M_lerp(chA.face.browCurve ?? 0, chB.face.browCurve ?? 0, blendT) + idleBrowAmt*0.22 + moodSmooth.browCurve;
    M_eyeTiltT = M_lerp(chA.face.eyeTilt ?? 0, chB.face.eyeTilt ?? 0, blendT) + idleSmugAmt*0.14*idleSmugDir + moodSmooth.eyeTilt;
    M_pupilSizeT = M_lerp(chA.face.pupilSize ?? 0, chB.face.pupilSize ?? 0, blendT) + idleSmugAmt*0.08 + moodSmooth.pupilSize;
    M_pupilLiftT = M_lerp(chA.face.pupilLift ?? 0, chB.face.pupilLift ?? 0, blendT) - idleSmileAmt*0.04 + moodSmooth.pupilLift;
    M_mouthOpenT = M_lerp(chA.face.mouthOpen ?? 0, chB.face.mouthOpen ?? 0, blendT) + M_overdrive*0.08 + idleSmugAmt*0.06 + M_fidgetFace*0.10 + moodSmooth.mouthOpen;
    M_mouthSkewT = M_lerp(chA.face.mouthSkew ?? 0, chB.face.mouthSkew ?? 0, blendT) + idleSmugAmt*0.18*idleSmugDir + moodSmooth.mouthSkew;
    M_mouthPinchT = M_lerp(chA.face.mouthPinch ?? 0, chB.face.mouthPinch ?? 0, blendT) + idleSmugAmt*0.08 + moodSmooth.mouthPinch;

    M_mouthS = M_damp(M_mouthS, M_mouthT, 8.0, dt);
    M_browS  = M_damp(M_browS,  M_browT,  8.0, dt);
    M_squintS= M_damp(M_squintS, M_squintT, 10.0, dt);
    M_grinS  = M_damp(M_grinS,  M_grinT,  8.0, dt);
    M_browTiltS = M_damp(M_browTiltS, M_browTiltT, 8.0, dt);
    M_mouthWidthS = M_damp(M_mouthWidthS, M_mouthWidthT, 8.0, dt);
    M_mouthYS = M_damp(M_mouthYS, M_mouthYT, 8.0, dt);
    M_eyeWideS = M_damp(M_eyeWideS, M_eyeWideT, 9.0, dt);
    M_eyeGapS = M_damp(M_eyeGapS, M_eyeGapT, 8.0, dt);
    M_browAsymS = M_damp(M_browAsymS, M_browAsymT, 8.0, dt);
    M_browCurveS = M_damp(M_browCurveS, M_browCurveT, 8.0, dt);
    M_eyeTiltS = M_damp(M_eyeTiltS, M_eyeTiltT, 9.0, dt);
    M_pupilSizeS = M_damp(M_pupilSizeS, M_pupilSizeT, 10.0, dt);
    M_pupilLiftS = M_damp(M_pupilLiftS, M_pupilLiftT, 9.0, dt);
    M_mouthOpenS = M_damp(M_mouthOpenS, M_mouthOpenT, 8.0, dt);
    M_mouthSkewS = M_damp(M_mouthSkewS, M_mouthSkewT, 8.0, dt);
    M_mouthPinchS = M_damp(M_mouthPinchS, M_mouthPinchT, 8.0, dt);

    M_mouth = M_mouthS;
    M_brow = M_browS;
    M_squint = M_squintS;
    M_grin = M_grinS;
    M_browTilt = M_browTiltS;
    M_mouthWidth = M_mouthWidthS;
    M_mouthY = M_mouthYS;
    M_eyeWide = M_eyeWideS;
    M_eyeGap = M_eyeGapS;
    M_browAsym = M_browAsymS;
    M_browCurve = M_browCurveS;
    M_eyeTilt = M_eyeTiltS;
    M_pupilSize = M_pupilSizeS;
    M_pupilLift = M_pupilLiftS;
    M_mouthOpen = M_mouthOpenS;
    M_mouthSkew = M_mouthSkewS;
    M_mouthPinch = M_mouthPinchS;

    // blink
    M_blinkTimer += dt;
    if (M_blinkTimer > M_nextBlink){ M_blinkTimer = 0; M_nextBlink = 1.3 + Math.random()*2.6; }
    const bp = Math.min(1.0, M_blinkTimer / 0.14);
    const bc = (bp < 0.5) ? (bp/0.5) : (1.0 - (bp-0.5)/0.5);
    const blinkActive = M_blinkTimer < 0.14;
    const blinkTarget = blinkActive ? (1.0 - bc) : 0.0;
    M_blink = M_damp(M_blink, blinkTarget, 18.0, dt);

    M_faceFrameAcc += dt;
    if (M_faceFrameAcc >= M_faceFrameInterval){
      M_drawFace();
      M_faceFrameAcc = M_faceFrameAcc % M_faceFrameInterval;
    }
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
    if (!M_introStarted){
      M_introStarted = true;
      M_introActive = true;
      M_introT = 0.0;
    }
    M_animLoop();
  }
  function M_stop(){
    M_running = false;
    cancelAnimationFrame(M_raf);
  }

  // Visible-only animation
  const M_io = new IntersectionObserver(([e])=>{
    if (!M_tourEnabled) {
      if (M_running) M_stop();
      return;
    }
    if (e.isIntersecting) M_start();
    else M_stop();
  }, { threshold: 0.05 });
  M_io.observe(M_tour);

  window.addEventListener("scroll", ()=>{
    if (!M_tourEnabled) return;
    if (!M_running) M_renderOnce();
  }, { passive:true });

  // Start
  M_renderOnce();
  if (M_tourEnabled && M_tourIsVisible()) M_start();

  return {
    triggerBrandRefresh: M_triggerBrandRefresh,
  };
}
