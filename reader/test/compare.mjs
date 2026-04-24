import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as rust from '../pkg-node/reader.js';
import * as ref from './reference.mjs';

const root = resolve(fileURLToPath(import.meta.url), '../../../gamefiles/WIPEOUT2');

const load = (relative) => {
  const buf = readFileSync(resolve(root, relative));
  return new Uint8Array(buf);
};

const deepEqual = (a, b, path = '$') => {
  if (a === b) return null;
  if (typeof a !== typeof b) return `${path}: type ${typeof a} vs ${typeof b}`;
  if (a && b && typeof a === 'object') {
    if (ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
      const ua = new Uint8Array(a.buffer ?? a, a.byteOffset ?? 0, a.byteLength);
      const ub = new Uint8Array(b.buffer ?? b, b.byteOffset ?? 0, b.byteLength);
      if (ua.length !== ub.length) return `${path}: len ${ua.length} vs ${ub.length}`;
      for (let i = 0; i < ua.length; i++) if (ua[i] !== ub[i]) return `${path}[${i}]: ${ua[i]} vs ${ub[i]}`;
      return null;
    }
    if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array shape mismatch`;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const r = deepEqual(a[k], b[k], `${path}.${k}`);
      if (r) return r;
    }
    return null;
  }
  return `${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
};

const results = [];
const check = (name, a, b) => {
  const diff = deepEqual(a, b);
  results.push({ name, ok: !diff, diff });
};

// 1. Unpack SKY.CMP (small texture archive)
{
  const buf = load('TRACK01/SKY.CMP');
  const jsFiles = ref.unpackImages(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const rsFiles = rust.unpack_images(buf);
  check('SKY.CMP: file count', jsFiles.length, rsFiles.length);
  for (let i = 0; i < Math.min(jsFiles.length, rsFiles.length); i++) {
    check(`SKY.CMP: file[${i}] bytes`, jsFiles[i], rsFiles[i]);
  }
}

// 2. Decode first image from SKY.CMP
{
  const buf = load('TRACK01/SKY.CMP');
  const jsFiles = ref.unpackImages(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const rsFiles = rust.unpack_images(buf);
  const imgJs = ref.decodeImage(jsFiles[0].buffer.slice(jsFiles[0].byteOffset, jsFiles[0].byteOffset + jsFiles[0].byteLength));
  const imgRs = rust.decode_image(rsFiles[0]);
  check('SKY.CMP[0]: width', imgJs.width, imgRs.width);
  check('SKY.CMP[0]: height', imgJs.height, imgRs.height);
  check('SKY.CMP[0]: rgba', imgJs.rgba, imgRs.rgba);
}

// 3. Parse SCENE.PRM
{
  const buf = load('TRACK01/SCENE.PRM');
  const jsObjs = ref.readObjects(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const rsObjs = rust.read_objects(buf);
  check('SCENE.PRM: object count', jsObjs.length, rsObjs.length);
  check('SCENE.PRM: full', jsObjs, rsObjs);
}

// 4. Parse SKY.PRM
{
  const buf = load('TRACK01/SKY.PRM');
  const jsObjs = ref.readObjects(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const rsObjs = rust.read_objects(buf);
  check('SKY.PRM: object count', jsObjs.length, rsObjs.length);
  check('SKY.PRM: full', jsObjs, rsObjs);
}

// 5. Track files
{
  const trv = load('TRACK01/TRACK.TRV');
  const trf = load('TRACK01/TRACK.TRF');
  const trs = load('TRACK01/TRACK.TRS');
  const tex = load('TRACK01/TRACK.TEX');
  const ttf = load('TRACK01/LIBRARY.TTF');

  const slice = (u) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);

  check('TRACK.TRV', ref.readTrackVertices(slice(trv)), rust.read_track_vertices(trv));
  check('TRACK.TRF', ref.readTrackFaces(slice(trf)), rust.read_track_faces(trf));
  check('TRACK.TRS', ref.readTrackSections(slice(trs)), rust.read_track_sections(trs));
  check('TRACK.TEX', ref.readTrackTextures(slice(tex)), rust.read_track_textures(tex));
  check('LIBRARY.TTF', ref.readTrackTextureIndex(slice(ttf)), rust.read_track_texture_index(ttf));
}

// 6. Ship PRM
{
  const buf = load('COMMON/TERRY.PRM');
  const jsObjs = ref.readObjects(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const rsObjs = rust.read_objects(buf);
  check('TERRY.PRM: full', jsObjs, rsObjs);
}

// 7. Sweep every track's core files
const tracks = ['TRACK01', 'TRACK02', 'TRACK04', 'TRACK06', 'TRACK07', 'TRACK08', 'TRACK13', 'TRACK17', 'TRACK20'];
for (const t of tracks) {
  try {
    const scene = load(`${t}/SCENE.PRM`);
    const sky = load(`${t}/SKY.PRM`);
    const trv = load(`${t}/TRACK.TRV`);
    const trf = load(`${t}/TRACK.TRF`);
    const slice = (u) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);
    check(`${t}: SCENE.PRM`, ref.readObjects(slice(scene)), rust.read_objects(scene));
    check(`${t}: SKY.PRM`, ref.readObjects(slice(sky)), rust.read_objects(sky));
    check(`${t}: TRACK.TRV`, ref.readTrackVertices(slice(trv)), rust.read_track_vertices(trv));
    check(`${t}: TRACK.TRF`, ref.readTrackFaces(slice(trf)), rust.read_track_faces(trf));
  } catch (e) {
    results.push({ name: `${t}: load`, ok: false, diff: e.message });
  }
}

let pass = 0, fail = 0;
for (const r of results) {
  if (r.ok) { pass++; continue; }
  fail++;
  console.log(`FAIL ${r.name}`);
  console.log(`  ${r.diff}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
