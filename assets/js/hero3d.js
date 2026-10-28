/* Sastre AI · portada: del plano a la planta industrial (Three.js r128) */
(function () {
  var qs = new URLSearchParams(location.search);
  var hero = document.getElementById('hero'), cv = document.getElementById('bim3d');
  var stages = [].slice.call(document.querySelectorAll('#stages li'));
  function fail() { document.documentElement.classList.add('nogl'); }
  if (!hero || !cv) return;
  if (!window.THREE) return fail();

  var forced = qs.get('p'), still = !!qs.get('noanim') || forced !== null, renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: still }); }
  catch (e) { return fail(); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = !qs.get('lite');
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var mix = function (a, b, k) { return a + (b - a) * k; };
  var sm = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var PI = Math.PI;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0a0c, 120, 230);
  var cam = new THREE.PerspectiveCamera(30, 1, 1, 600);
  var CX = 30, CZ = 0;

  // ── Luz ──
  scene.add(new THREE.HemisphereLight(0xdfe3ea, 0x0a0a0c, .5));
  var sun = new THREE.DirectionalLight(0xf3f5fa, 1.35);
  sun.position.set(CX + 45, 80, 50); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera; sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 20; sc.far = 260;
  sun.shadow.bias = -0.0006; sun.shadow.radius = 5; sun.target.position.set(CX, 0, CZ); scene.add(sun, sun.target);
  var fill = new THREE.DirectionalLight(0x9ea9c2, .34); fill.position.set(CX - 60, 30, 50); scene.add(fill);
  var rim = new THREE.DirectionalLight(0xff3d8e, .12); rim.position.set(CX - 60, 8, -50); scene.add(rim);

  // Suelo que se funde con el fondo
  (function () {
    var c = document.createElement('canvas'); c.width = c.height = 256; var x = c.getContext('2d');
    var g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, '#a0a0a0'); g.addColorStop(.5, '#4a4a4a'); g.addColorStop(1, '#000');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    var m = new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 1, transparent: true, alphaMap: new THREE.CanvasTexture(c), depthWrite: false });
    var d = new THREE.Mesh(new THREE.CircleGeometry(80, 96), m); d.rotation.x = -PI / 2; d.position.set(CX, 0, CZ); d.receiveShadow = true; scene.add(d);
  })();

  // ── Utilidades ──
  var LINE = function (color, op) { return new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: op, toneMapped: false, depthWrite: false }); };
  function segs(a) { var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return g; }
  function rect(a, x0, x1, z0, z1, y) { a.push(x0, y, z0, x1, y, z0, x1, y, z0, x1, y, z1, x1, y, z1, x0, y, z1, x0, y, z1, x0, y, z0); }
  function circle(a, cx, cz, r, y, n) { n = n || 48; for (var i = 0; i < n; i++) { var t0 = i / n * 2 * PI, t1 = (i + 1) / n * 2 * PI; a.push(cx + Math.cos(t0) * r, y, cz + Math.sin(t0) * r, cx + Math.cos(t1) * r, y, cz + Math.sin(t1) * r); } }
  function boxEdges(a, cx, y0, cz, sx, sy, sz) {
    var x0 = cx - sx / 2, x1 = cx + sx / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, y1 = y0 + sy;
    rect(a, x0, x1, z0, z1, y0); rect(a, x0, x1, z0, z1, y1);
    a.push(x0, y0, z0, x0, y1, z0, x1, y0, z0, x1, y1, z0, x1, y0, z1, x1, y1, z1, x0, y0, z1, x0, y1, z1);
  }
  function shadow(o) { o.traverse(function (m) { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
  function fade(mats, o) {
    mats.forEach(function (m) {
      if (m.isLineBasicMaterial) { m.opacity = m.userData.o * o; return; }
      m.opacity = (m.userData.o == null ? 1 : m.userData.o) * o;
      m.transparent = o < .999 || !!m.userData.glass; m.depthWrite = !m.userData.glass && o > .5;
    });
  }
  function mat(base, o) { var m = base.clone(); m.userData = { o: o == null ? 1 : o, glass: !!base.userData.glass }; return m; }
  function lmat(c, o) { var m = LINE(c, o); m.userData.o = o; return m; }

  // Textura de chapa grecada
  var rib = (function () {
    var c = document.createElement('canvas'); c.width = 64; c.height = 8; var x = c.getContext('2d');
    x.fillStyle = '#d4d4d8'; x.fillRect(0, 0, 64, 8); x.fillStyle = '#86868e'; x.fillRect(0, 0, 6, 8); x.fillStyle = '#ececf0'; x.fillRect(6, 0, 3, 8);
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; return t;
  })();
  var wallRib = rib.clone(); wallRib.needsUpdate = true; wallRib.repeat.set(12, 1);

  var BASE = {
    steel: new THREE.MeshStandardMaterial({ color: 0x2a2a31, roughness: .42, metalness: .55 }),
    clad: new THREE.MeshStandardMaterial({ color: 0x2b2b32, roughness: .55, metalness: .45, map: rib, side: THREE.DoubleSide }),
    wall: new THREE.MeshStandardMaterial({ color: 0x26262c, roughness: .6, metalness: .4, map: wallRib }),
    glass: new THREE.MeshStandardMaterial({ color: 0xc9d3e3, roughness: .05, metalness: .25, transparent: true, opacity: .24, side: THREE.DoubleSide, depthWrite: false }),
    tank: new THREE.MeshStandardMaterial({ color: 0x8b8b95, roughness: .34, metalness: .45 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x2c2c32, roughness: .95, metalness: 0 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0f0f13, roughness: .7, metalness: .2 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x6c6c76, roughness: .3, metalness: .6 }),
    pink: new THREE.MeshBasicMaterial({ color: 0xff3d8e, toneMapped: false, transparent: true })
  };
  BASE.glass.userData.glass = true;

  // ── Nave: pórticos con cercha curva ──
  var L = 36, BAY = 6, S = 10, HC = 8, RISE = 4;
  var YC = (2 * HC + RISE - S * S / RISE) / 2, R = HC + RISE - YC;
  var archY = function (z, rr) { rr = rr || R; return YC + Math.sqrt(Math.max(0, rr * rr - z * z)); };
  var NF = L / BAY + 1, anim = [];

  for (var k = 0; k < NF; k++) (function (k) {
    var x = k * BAY, g = new THREE.Group(), mS = mat(BASE.steel), cl = lmat(0xffffff, .35), wm = lmat(0xffffff, .45);
    var colGeo = new THREE.BoxGeometry(.55, HC, .55); colGeo.translate(0, HC / 2, 0);
    var cols = new THREE.Group();
    [-S, S].forEach(function (z) { var c = new THREE.Mesh(colGeo, mS); c.position.set(x, 0, z); cols.add(c); });
    var ce = []; boxEdges(ce, x, 0, -S, .55, HC, .55); boxEdges(ce, x, 0, S, .55, HC, .55);
    cols.add(new THREE.LineSegments(segs(ce), cl)); g.add(cols);
    var top = [], bot = [], n = 24, Rb = R - 1;
    for (var i = 0; i <= n; i++) { var z = -S + 2 * S * i / n, zb = z * Rb / R; top.push(new THREE.Vector3(x, archY(z), z)); bot.push(new THREE.Vector3(x, archY(zb, Rb), zb)); }
    var tGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(top), 64, .16, 8), bGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bot), 64, .12, 8);
    g.add(new THREE.Mesh(tGeo, mS), new THREE.Mesh(bGeo, mS));
    var web = []; for (i = 0; i < n; i++) web.push(bot[i].x, bot[i].y, bot[i].z, top[i + 1].x, top[i + 1].y, top[i + 1].z, top[i + 1].x, top[i + 1].y, top[i + 1].z, bot[i + 1].x, bot[i + 1].y, bot[i + 1].z);
    var webL = new THREE.LineSegments(segs(web), wm); g.add(webL);
    shadow(g); scene.add(g);
    var tN = tGeo.index.count, bN = bGeo.index.count, wN = web.length / 3;
    anim.push(function (p) {
      var u = clamp(sm(.08, .44, p) * NF - k, 0, 1), uc = sm(0, .5, u), ua = sm(.4, 1, u);
      g.visible = uc > 0; cols.scale.y = Math.max(.001, uc);
      tGeo.setDrawRange(0, Math.floor(tN * ua / 3) * 3); bGeo.setDrawRange(0, Math.floor(bN * ua / 3) * 3); webL.geometry.setDrawRange(0, Math.floor(wN * ua / 2) * 2);
      fade([mS], Math.min(1, uc * 1.8)); fade([cl, wm], uc);
    });
  })(k);

  // Correas longitudinales
  (function () {
    var a = [], zs = [-9, -6, -3, 3, 6, 9]; zs.forEach(function (z) { a.push(0, archY(z) + .2, z, L, archY(z) + .2, z); });
    [-S, S].forEach(function (z) { a.push(0, HC, z, L, HC, z); });
    var m = lmat(0xffffff, .3), l = new THREE.LineSegments(segs(a), m); scene.add(l); var n = a.length / 3;
    anim.push(function (p) { var u = sm(.3, .5, p); l.visible = u > 0; l.geometry.setDrawRange(0, Math.floor(n * u / 2) * 2); m.opacity = .3 * u; });
  })();

  // Cubierta por vanos: chapa grecada y lucernario central
  function shell(x0, x1, z0, z1, rr, nz) {
    var pos = [], uv = [], idx = [];
    for (var j = 0; j <= nz; j++) { var z = z0 + (z1 - z0) * j / nz, y = archY(z, rr); pos.push(x0, y, z, x1, y, z); uv.push(0, j / nz, (x1 - x0) / .5, j / nz); }
    for (j = 0; j < nz; j++) { var a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  for (var b = 0; b < NF - 1; b++) (function (b) {
    var x0 = b * BAY, x1 = x0 + BAY, g = new THREE.Group(), mC = mat(BASE.clad), mG = mat(BASE.glass, .24), mW = mat(BASE.wall), lm = lmat(0xffffff, .4);
    g.add(new THREE.Mesh(shell(x0, x1, -S - .5, -2.4, R + .3, 18), mC), new THREE.Mesh(shell(x0, x1, 2.4, S + .5, R + .3, 18), mC), new THREE.Mesh(shell(x0, x1, -2.4, 2.4, R + .55, 8), mG));
    [-S - .35, S + .35].forEach(function (z) {
      var w = new THREE.Mesh(new THREE.BoxGeometry(BAY, 5.8, .2), mW); w.position.set(x0 + BAY / 2, 2.9, z); g.add(w);
      var gl = new THREE.Mesh(new THREE.PlaneGeometry(BAY, 2.2), mG); gl.position.set(x0 + BAY / 2, 6.9, z); g.add(gl);
    });
    var e = []; [-S - .45, S + .45].forEach(function (z) { e.push(x0, 5.8, z, x1, 5.8, z, x0, 8, z, x1, 8, z); });
    g.add(new THREE.LineSegments(segs(e), lm));
    shadow(g); scene.add(g);
    anim.push(function (p) { var v = clamp(sm(.5, .8, p) * (NF - 1) - b, 0, 1), q = sm(0, 1, v); g.visible = q > 0; g.position.y = (1 - q) * 1.6; fade([mC, mG, mW, lm], q); });
  })(b);

  // Testero acristalado con lamas que siguen el arco
  (function () {
    var g = new THREE.Group(), mG = mat(BASE.glass, .3), mF = mat(BASE.steel), mD = mat(BASE.dark), mW = mat(BASE.wall), lm = lmat(0xffffff, .6);
    var sh = new THREE.Shape(); sh.moveTo(-S, 0); for (var i = 0; i <= 32; i++) { var z = -S + 2 * S * i / 32; sh.lineTo(z, archY(z)); } sh.lineTo(-S, 0);
    var gg = new THREE.ShapeGeometry(sh); gg.rotateY(-PI / 2);
    var glass = new THREE.Mesh(gg, mG); glass.position.x = -.1; g.add(glass);
    var back = new THREE.Mesh(gg.clone(), mW); back.position.x = L + .1; g.add(back);
    var door = new THREE.Mesh(new THREE.BoxGeometry(.2, 5.2, 7), mD); door.position.set(-.2, 2.6, 0); g.add(door);
    var fg = new THREE.BoxGeometry(.7, 1, .09); fg.translate(0, .5, 0);
    var zs = []; for (var zz = -S + .8; zz < S; zz += 1.0) zs.push(zz);
    var fins = new THREE.InstancedMesh(fg, mF, zs.length), d = new THREE.Object3D();
    zs.forEach(function (z, i) { d.position.set(-.5, 0, z); d.scale.set(1, archY(z) - .15, 1); d.updateMatrix(); fins.setMatrixAt(i, d.matrix); }); g.add(fins);
    var e = []; for (i = 0; i < 32; i++) { var z0 = -S + 2 * S * i / 32, z1 = -S + 2 * S * (i + 1) / 32; e.push(-.85, archY(z0), z0, -.85, archY(z1), z1); }
    g.add(new THREE.LineSegments(segs(e), lm));
    shadow(g); scene.add(g);
    anim.push(function (p) { var v = sm(.66, .86, p); g.visible = v > 0; g.scale.y = Math.max(.001, v); fade([mG, mF, mD, mW, lm], v); });
  })();

  // ── Depósitos verticales ──
  function tank(cx, cz, r, h, t0, t1) {
    var g = new THREE.Group(), body = new THREE.Group(), mT = mat(BASE.tank), mB = mat(BASE.concrete), lm = lmat(0xffffff, .3), lm2 = lmat(0xffffff, .45);
    var base = new THREE.Mesh(new THREE.CylinderGeometry(r + .7, r + .7, .5, 48), mB); base.position.set(cx, .25, cz); g.add(base);
    var shellM = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 56, 1, true), mT); shellM.position.set(cx, h / 2, cz); body.add(shellM);
    var dome = new THREE.Mesh(new THREE.SphereGeometry(r, 56, 12, 0, 2 * PI, 0, PI / 2), mT); dome.scale.y = .28; dome.position.set(cx, h, cz); body.add(dome);
    var ring = []; for (var y = 1.6; y < h; y += 2.2) circle(ring, cx, cz, r + .03, y, 56);
    var ld = [], ax = cx + r + .35; ld.push(ax, 0, cz - .3, ax, h + .6, cz - .3, ax, 0, cz + .3, ax, h + .6, cz + .3); for (y = .6; y < h; y += .6) ld.push(ax, y, cz - .3, ax, y, cz + .3);
    body.add(new THREE.LineSegments(segs(ring), lm), new THREE.LineSegments(segs(ld), lm2));
    body.position.y = .5; g.add(body); shadow(g); scene.add(g);
    anim.push(function (p) { var u = sm(t0, t1, p); g.visible = u > 0; body.scale.y = Math.max(.001, sm(.1, 1, u)); fade([mT, mB, lm, lm2], Math.min(1, u * 2)); });
  }
  tank(46, -6, 3.4, 13, .22, .5);
  tank(46, 6.5, 3, 10, .26, .52);
  tank(55.5, 0, 3.8, 15, .3, .58);

  // Recipiente horizontal sobre cunas
  (function () {
    var g = new THREE.Group(), body = new THREE.Group(), mT = mat(BASE.tank), mB = mat(BASE.concrete), lm = lmat(0xffffff, .32), r = 1.6, len = 8, cx = 56.5, cz = 9.6, cy = 2.4;
    var cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 40, 1, true), mT); cyl.rotation.z = PI / 2; body.add(cyl);
    [-1, 1].forEach(function (s) { var hd = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 16, 0, 2 * PI, 0, PI / 2), mT); hd.rotation.z = -s * PI / 2; hd.scale.y = .55; hd.position.x = s * len / 2; body.add(hd); });
    var ring = []; [-2.6, 0, 2.6].forEach(function (dx) { var n = 40; for (var i = 0; i < n; i++) { var a0 = i / n * 2 * PI, a1 = (i + 1) / n * 2 * PI; ring.push(dx, Math.cos(a0) * (r + .03), Math.sin(a0) * (r + .03), dx, Math.cos(a1) * (r + .03), Math.sin(a1) * (r + .03)); } });
    body.add(new THREE.LineSegments(segs(ring), lm));
    body.position.set(cx, cy, cz); g.add(body);
    [-2.6, 2.6].forEach(function (dx) { var s = new THREE.Mesh(new THREE.BoxGeometry(.6, cy, 2.6), mB); s.position.set(cx + dx, cy / 2, cz); g.add(s); });
    shadow(g); scene.add(g);
    anim.push(function (p) { var u = sm(.56, .76, p); g.visible = u > 0; body.scale.set(Math.max(.001, u), 1, 1); fade([mT, mB, lm], u); });
  })();

  // Chimenea con remate rosa
  (function () {
    var g = new THREE.Group(), body = new THREE.Group(), mT = mat(BASE.tank), mB = mat(BASE.concrete), lm = lmat(0xffffff, .4), h = 22, cx = 62, cz = -7.5;
    var base = new THREE.Mesh(new THREE.BoxGeometry(2.6, .6, 2.6), mB); base.position.set(cx, .3, cz); g.add(base);
    var s = new THREE.Mesh(new THREE.CylinderGeometry(.6, .78, h, 36), mT); s.position.set(cx, h / 2, cz); body.add(s);
    var ring = []; [h * .35, h * .7].forEach(function (y) { circle(ring, cx, cz, .78 - .18 * y / h + .04, y, 36); });
    body.add(new THREE.LineSegments(segs(ring), lm));
    body.position.y = .6; g.add(body); shadow(g); scene.add(g);
    var pr = []; circle(pr, cx, cz, .66, h + .62, 36); circle(pr, cx, cz, .68, h + .2, 36);
    var pm = LINE(0xff3d8e, 0), topRing = new THREE.LineSegments(segs(pr), pm); scene.add(topRing);
    anim.push(function (p) { var u = sm(.34, .64, p); g.visible = u > 0; body.scale.y = Math.max(.001, u); fade([mT, mB, lm], Math.min(1, u * 2)); pm.opacity = sm(.9, 1, p); });
  })();

  // ── Rack de tuberías: de la nave a los equipos ──
  (function () {
    var mS = mat(BASE.steel), lm = lmat(0xffffff, .35), fr = [];
    var cg = new THREE.BoxGeometry(.32, 6, .32); cg.translate(0, 3, 0);
    var frames = new THREE.Group();
    [38, 42, 46, 50].forEach(function (x) {
      [-1.4, 1.4].forEach(function (z) { var c = new THREE.Mesh(cg, mS); c.position.set(x, 0, z); frames.add(c); boxEdges(fr, x, 0, z, .32, 6, .32); });
      var bm = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, 3.4), mS); bm.position.set(x, 6, 0); frames.add(bm);
    });
    frames.add(new THREE.LineSegments(segs(fr), lm)); shadow(frames); scene.add(frames);
    function pipeX(len, r, z, m) { var gg = new THREE.CylinderGeometry(r, r, len, 20); gg.rotateZ(-PI / 2); gg.translate(len / 2, 0, 0); var o = new THREE.Mesh(gg, m); o.position.set(36, 6.15 + r, z); o.castShadow = true; scene.add(o); return o; }
    function pipeZ(x, z0, z1, r, m) { var len = Math.abs(z1 - z0), gg = new THREE.CylinderGeometry(r, r, len, 16); gg.rotateX(PI / 2); gg.translate(0, 0, (z1 > z0 ? 1 : -1) * len / 2); var o = new THREE.Mesh(gg, m); o.position.set(x, 6.15 + r, z0); o.castShadow = true; scene.add(o); return o; }
    var mP = mat(BASE.pipe);
    var pipes = [pipeX(14, .26, -.95, mP), pipeX(14, .2, -.35, mP), pipeX(14, .3, .95, mP)];
    var branches = [pipeZ(46.6, -.95, -2.75, .26, mP), pipeZ(45.2, .95, 3.6, .3, mP)];
    var mPk = BASE.pink.clone(); mPk.opacity = 0;
    var pink = pipeX(15.75, .22, .35, mPk);
    anim.push(function (p) {
      var u = sm(.3, .52, p); frames.visible = u > 0; frames.scale.y = Math.max(.001, u); fade([mS, lm], Math.min(1, u * 1.8));
      var v = sm(.56, .82, p); pipes.forEach(function (o) { o.visible = v > 0; o.scale.x = Math.max(.001, v); });
      var w = sm(.76, .88, p); branches.forEach(function (o) { o.visible = w > 0; o.scale.z = Math.max(.001, w); });
      var k = sm(.86, .98, p); pink.visible = k > 0; pink.scale.x = Math.max(.001, k); mPk.opacity = k;
    });
  })();

  // ── Plano en el suelo ──
  var planMats = [], planLines = [], Y0 = .04;
  (function () {
    var ax = []; for (var k = 0; k < NF; k++) ax.push(k * BAY, Y0, -13.5, k * BAY, Y0, 13.5); [-S, S].forEach(function (z) { ax.push(-2, Y0, z, 66, Y0, z); });
    var fp = []; rect(fp, -.5, L + .5, -S - .5, S + .5, Y0); for (k = 0; k < NF; k++) [-S, S].forEach(function (z) { rect(fp, k * BAY - .3, k * BAY + .3, z - .3, z + .3, Y0); });
    circle(fp, 46, -6, 3.4, Y0); circle(fp, 46, 6.5, 3, Y0); circle(fp, 55.5, 0, 3.8, Y0); circle(fp, 62, -7.5, .8, Y0); rect(fp, 51.3, 61.7, 8, 11.2, Y0); rect(fp, 36, 50.5, -1.6, 1.6, Y0);
    var bub = []; for (k = 0; k < NF; k++) circle(bub, k * BAY, -15, .95, Y0, 32); [-S, S].forEach(function (z) { circle(bub, -3.6, z, .95, Y0, 32); });
    bub.push(0, Y0, 14.8, L, Y0, 14.8, 0, Y0, 14.2, 0, Y0, 15.4, L, Y0, 14.2, L, Y0, 15.4);
    [[ax, .3], [fp, .8], [bub, .7]].forEach(function (d) { var m = lmat(0xffffff, d[1]), l = new THREE.LineSegments(segs(d[0]), m); scene.add(l); planMats.push(m); planLines.push(l); });
  })();
  function label(txt, h) {
    var c = document.createElement('canvas'), x = c.getContext('2d'), fs = 96, font = '500 ' + fs + 'px "Space Grotesk", sans-serif';
    x.font = font; var w = Math.ceil(x.measureText(txt).width) + 30; c.width = w; c.height = Math.ceil(fs * 1.35);
    x.font = font; x.fillStyle = '#f2f2f4'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, c.height / 2 + 4);
    var t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.encoding = THREE.sRGBEncoding;
    var m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }); m.userData = { o: .95, label: true };
    var s = new THREE.Sprite(m); s.scale.set(h * w / c.height, h, 1); planMats.push(m); scene.add(s); return s;
  }
  function addLabels() {
    'ABCDEFG'.split('').forEach(function (l, i) { label(l, 1.15).position.set(i * BAY, .5, -15); });
    label('1', 1.15).position.set(-3.6, .5, -S); label('2', 1.15).position.set(-3.6, .5, S);
    label(document.documentElement.lang === 'en' ? '36.00 m' : '36,00 m', 1.3).position.set(L / 2, .6, 16.1);
  }
  if (document.fonts && document.fonts.load) document.fonts.load('500 96px "Space Grotesk"').then(addLabels, addLabels); else addLabels();

  // ── Tamaño, progreso y bucle ──
  var W = 1, Hh = 1, aspect = 1;
  function size() { W = cv.clientWidth || 1; Hh = cv.clientHeight || 1; aspect = W / Hh; renderer.setSize(W, Hh, false); cam.aspect = aspect; cam.updateProjectionMatrix(); }
  if (window.ResizeObserver) new ResizeObserver(size).observe(cv); else addEventListener('resize', size);
  size();
  function progress() { if (forced !== null) return clamp(parseFloat(forced), 0, 1); var span = hero.offsetHeight - innerHeight; return clamp((scrollY - hero.offsetTop) / Math.max(1, span), 0, 1); }
  var t0 = performance.now(), visible = true;
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(hero);

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    var t = (now - t0) / 1000, p = progress(), intro = still ? 1 : sm(.2, 2.2, t);
    var planA = intro * mix(1, .25, sm(.1, .45, p)) * (1 - .6 * sm(.6, .95, p)), labA = 1 - sm(.35, .6, p);
    planMats.forEach(function (m) { m.opacity = m.userData.o * planA * (m.userData.label ? labA : 1); });
    planLines.forEach(function (l) { var n = l.geometry.attributes.position.count; l.geometry.setDrawRange(0, Math.floor(n * sm(0, 1, intro) / 2) * 2); });
    anim.forEach(function (f) { f(p); });

    var e = sm(0, .7, p), fit = 2 * Math.tan(cam.fov * PI / 360);
    var Rtop = Math.max(34, 74 / aspect) / fit, Rend = Math.max(50, 84 / aspect) / fit;
    var R0 = mix(Rtop, Rend, e), phi = mix(.035, .98, e);
    var th = mix(0, -.74, e) + (still ? 0 : Math.sin(t * .2) * .04 * (.4 + .6 * sm(.7, 1, p)));
    var ty = mix(0, 6.5, e), cx = mix(CX, CX + 2, e);
    cam.position.set(cx + R0 * Math.sin(phi) * Math.sin(th), ty + R0 * Math.cos(phi), CZ + R0 * Math.sin(phi) * Math.cos(th));
    cam.lookAt(cx, ty, CZ);
    if (W > 700) cam.setViewOffset(W, Hh, -W * .13, 0, W, Hh); else cam.clearViewOffset();

    var st = p < .12 ? 0 : p < .5 ? 1 : 2;
    stages.forEach(function (li, i) { li.classList.toggle('on', i === st); });
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);
})();
