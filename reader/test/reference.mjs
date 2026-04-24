// Independent reference reader written against DataView. Matches the TS implementation's
// format assumptions (big-endian for game data, little-endian for TIM).

export function unpackImages(buffer) {
  const data = new DataView(buffer);
  const numberOfFiles = data.getUint32(0, true);
  const packedDataOffset = (numberOfFiles + 1) * 4;

  let unpackedLength = 0;
  const lengths = [];
  for (let i = 0; i < numberOfFiles; i++) {
    const l = data.getUint32((i + 1) * 4, true);
    lengths.push(l);
    unpackedLength += l;
  }

  const src = new Uint8Array(buffer, packedDataOffset);
  const dst = new Uint8Array(unpackedLength);
  const wnd = new Uint8Array(0x2000);
  let srcPos = 0, dstPos = 0, wndPos = 1, curByte = 0, bitMask = 0x80;

  const readBitfield = (size) => {
    let value = 0;
    while (size > 0) {
      if (bitMask === 0x80) curByte = src[srcPos++];
      if (curByte & bitMask) value |= size;
      size >>= 1;
      bitMask >>= 1;
      if (bitMask === 0) bitMask = 0x80;
    }
    return value;
  };

  while (true) {
    if (srcPos > src.byteLength || dstPos > unpackedLength) break;
    if (bitMask === 0x80) curByte = src[srcPos++];
    const curBit = curByte & bitMask;
    bitMask >>= 1;
    if (bitMask === 0) bitMask = 0x80;

    if (curBit) {
      const b = readBitfield(0x80);
      wnd[wndPos & 0x1fff] = dst[dstPos] = b;
      wndPos++; dstPos++;
    } else {
      const position = readBitfield(0x1000);
      if (position === 0) break;
      const length = readBitfield(0x08) + 2;
      for (let i = 0; i <= length; i++) {
        const b = wnd[(i + position) & 0x1fff];
        wnd[wndPos & 0x1fff] = dst[dstPos] = b;
        wndPos++; dstPos++;
      }
    }
  }

  const out = [];
  let offset = 0;
  for (const len of lengths) {
    out.push(new Uint8Array(dst.buffer, offset, len));
    offset += len;
  }
  return out;
}

export function readObjects(buffer) {
  const view = new DataView(buffer);
  const results = [];
  let o = 0;
  while (o < buffer.byteLength) {
    const { object, size } = readObject(view, o, buffer);
    results.push(object);
    o += size;
  }
  return results;
}

function readObject(view, start, buffer) {
  let o = start;
  const name = readFixedString(buffer, o, 15); o += 15 + 1;
  const vertexCount = view.getUint16(o); o += 2;
  o += 14;
  const polygonCount = view.getUint16(o); o += 2;
  o += 20;
  const index1 = view.getUint16(o); o += 2;
  o += 28;
  const origin = { x: view.getInt32(o), y: view.getInt32(o + 4), z: view.getInt32(o + 8) }; o += 12;
  o += 20;
  const position = { x: view.getInt32(o), y: view.getInt32(o + 4), z: view.getInt32(o + 8) }; o += 12;
  o += 16;

  const vertices = [];
  for (let i = 0; i < vertexCount; i++) {
    vertices.push({
      x: view.getInt16(o),
      y: view.getInt16(o + 2),
      z: view.getInt16(o + 4),
    });
    o += 8; // includes 2-byte padding
  }

  const polygons = [];
  for (let i = 0; i < polygonCount; i++) {
    const { polygon, size } = readPolygon(view, o);
    polygons.push(polygon);
    o += size;
  }

  return {
    object: { header: { name, vertex_count: vertexCount, polygon_count: polygonCount, index1, origin, position }, vertices, polygons },
    size: o - start,
  };
}

function readUvs(view, o, n) {
  const uv = [];
  for (let i = 0; i < n; i++) uv.push({ u: view.getUint8(o + i * 2), v: view.getUint8(o + i * 2 + 1) });
  return uv;
}

function readU16s(view, o, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(view.getUint16(o + i * 2));
  return out;
}

function readU32s(view, o, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(view.getUint32(o + i * 4));
  return out;
}

function readPolygon(view, start) {
  let o = start;
  const kind = view.getUint16(o); o += 2;
  const subtype = view.getUint16(o); o += 2;

  switch (kind) {
    case 0x00: {
      o += 14;
      return { polygon: { kind: 'unknown00', subtype }, size: o - start };
    }
    case 0x01: {
      const indices = readU16s(view, o, 3); o += 6;
      o += 2;
      const color = view.getUint32(o); o += 4;
      return { polygon: { kind: 'flat_tris_face_color', subtype, indices, color }, size: o - start };
    }
    case 0x02: {
      const indices = readU16s(view, o, 3); o += 6;
      const texture = view.getUint16(o); o += 2;
      o += 4;
      const uv = readUvs(view, o, 3); o += 6;
      o += 2;
      const color = view.getUint32(o); o += 4;
      return { polygon: { kind: 'textured_tris_face_color', subtype, indices, texture, uv, color }, size: o - start };
    }
    case 0x03: {
      const indices = readU16s(view, o, 4); o += 8;
      const color = view.getUint32(o); o += 4;
      return { polygon: { kind: 'flat_quad_face_color', subtype, indices, color }, size: o - start };
    }
    case 0x04: {
      const indices = readU16s(view, o, 4); o += 8;
      const texture = view.getUint16(o); o += 2;
      o += 4;
      const uv = readUvs(view, o, 4); o += 8;
      o += 2;
      const color = view.getUint32(o); o += 4;
      return { polygon: { kind: 'textured_quad_face_color', subtype, indices, texture, uv, color }, size: o - start };
    }
    case 0x05: {
      const indices = readU16s(view, o, 3); o += 6;
      o += 2;
      const colors = readU32s(view, o, 3); o += 12;
      return { polygon: { kind: 'flat_tris_vertex_color', subtype, indices, colors }, size: o - start };
    }
    case 0x06: {
      const indices = readU16s(view, o, 3); o += 6;
      const texture = view.getUint16(o); o += 2;
      o += 4;
      const uv = readUvs(view, o, 3); o += 6;
      o += 2;
      const colors = readU32s(view, o, 3); o += 12;
      return { polygon: { kind: 'textured_tris_vertex_color', subtype, indices, texture, uv, colors }, size: o - start };
    }
    case 0x07: {
      const indices = readU16s(view, o, 4); o += 8;
      const colors = readU32s(view, o, 4); o += 16;
      return { polygon: { kind: 'flat_quad_vertex_color', subtype, indices, colors }, size: o - start };
    }
    case 0x08: {
      const indices = readU16s(view, o, 4); o += 8;
      const texture = view.getUint16(o); o += 2;
      o += 4;
      const uv = readUvs(view, o, 4); o += 8;
      o += 2;
      const colors = readU32s(view, o, 4); o += 16;
      return { polygon: { kind: 'textured_quad_vertex_color', subtype, indices, texture, uv, colors }, size: o - start };
    }
    case 0x0A:
    case 0x0B: {
      const index = view.getUint16(o); o += 2;
      const width = view.getUint16(o); o += 2;
      const height = view.getUint16(o); o += 2;
      const texture = view.getUint16(o); o += 2;
      const color = view.getUint32(o); o += 4;
      const label = kind === 0x0A ? 'sprite_top_anchor' : 'sprite_bottom_anchor';
      return { polygon: { kind: label, subtype, index, width, height, texture, color }, size: o - start };
    }
    default:
      throw new Error(`unknown polygon type 0x${kind.toString(16)}`);
  }
}

function readFixedString(buffer, offset, len) {
  const bytes = new Uint8Array(buffer, offset, len);
  let end = bytes.indexOf(0);
  if (end < 0) end = len;
  return new TextDecoder().decode(bytes.subarray(0, end));
}

export function readTrackVertices(buffer) {
  const view = new DataView(buffer);
  const n = buffer.byteLength / 16;
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = i * 16;
    out.push({ x: view.getInt32(o), y: view.getInt32(o + 4), z: view.getInt32(o + 8) });
  }
  return out;
}

export function readTrackFaces(buffer) {
  const view = new DataView(buffer);
  const n = buffer.byteLength / 20;
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = i * 20;
    out.push({
      indices: [view.getUint16(o), view.getUint16(o + 2), view.getUint16(o + 4), view.getUint16(o + 6)],
      normal: [view.getInt16(o + 8), view.getInt16(o + 10), view.getInt16(o + 12)],
      tile: view.getUint8(o + 14),
      flags: view.getUint8(o + 15),
      color: view.getUint32(o + 16),
    });
  }
  return out;
}

export function readTrackSections(buffer) {
  const view = new DataView(buffer);
  const n = buffer.byteLength / 156;
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = i * 156;
    out.push({
      next_junction: view.getInt32(o),
      previous: view.getInt32(o + 4),
      next: view.getInt32(o + 8),
      x: view.getInt32(o + 12),
      y: view.getInt32(o + 16),
      z: view.getInt32(o + 20),
      first_face: view.getUint32(o + 140),
      num_faces: view.getUint16(o + 144),
      flags: view.getUint16(o + 150),
    });
  }
  return out;
}

export function readTrackTextureIndex(buffer) {
  const view = new DataView(buffer);
  const n = buffer.byteLength / 42;
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = i * 42;
    const near = [], med = [];
    for (let j = 0; j < 16; j++) near.push(view.getUint16(o + j * 2));
    for (let j = 0; j < 4; j++) med.push(view.getUint16(o + 32 + j * 2));
    const far = [view.getUint16(o + 40)];
    out.push({ near, med, far });
  }
  return out;
}

export function readTrackTextures(buffer) {
  const view = new DataView(buffer);
  const n = buffer.byteLength / 2;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ tile: view.getUint8(i * 2), flags: view.getUint8(i * 2 + 1) });
  }
  return out;
}

export function decodeImage(buffer) {
  const view = new DataView(buffer);
  let o = 0;
  const magic = view.getUint32(o, true); o += 4;
  const type = view.getUint32(o, true); o += 4;
  const headerLength = view.getUint32(o, true); o += 4;
  const paletteX = view.getUint16(o, true); o += 2;
  const paletteY = view.getUint16(o, true); o += 2;
  const paletteColors = view.getUint16(o, true); o += 2;
  const palettes = view.getUint16(o, true); o += 2;

  let palette = null;
  if (type === 0x08 || type === 0x09) {
    palette = [];
    for (let i = 0; i < paletteColors; i++) palette.push(view.getUint16(o + i * 2, true));
    o += paletteColors * 2;
  }
  o += 4;

  const skipX = view.getUint16(o, true); o += 2;
  const skipY = view.getUint16(o, true); o += 2;
  const rawWidth = view.getUint16(o, true); o += 2;
  const height = view.getUint16(o, true); o += 2;

  let pixelsPerShort = 1;
  if (type === 0x09) pixelsPerShort = 2;
  else if (type === 0x08) pixelsPerShort = 4;
  const width = rawWidth * pixelsPerShort;
  const entries = rawWidth * height;

  const rgba = new Uint8Array(entries * pixelsPerShort * 4);
  const putPixel = (off, c) => {
    rgba[off] = (c & 0x1f) << 3;
    rgba[off + 1] = ((c >> 5) & 0x1f) << 3;
    rgba[off + 2] = ((c >> 10) & 0x1f) << 3;
    rgba[off + 3] = c === 0 ? 0 : 0xff;
  };

  if (type === 0x02) {
    for (let i = 0; i < entries; i++) putPixel(i * 4, view.getUint16(o + i * 2, true));
  } else if (type === 0x09) {
    for (let i = 0; i < entries; i++) {
      const p = view.getUint16(o + i * 2, true);
      putPixel(i * 8, palette[p & 0xff]);
      putPixel(i * 8 + 4, palette[(p >> 8) & 0xff]);
    }
  } else if (type === 0x08) {
    for (let i = 0; i < entries; i++) {
      const p = view.getUint16(o + i * 2, true);
      putPixel(i * 16, palette[p & 0xf]);
      putPixel(i * 16 + 4, palette[(p >> 4) & 0xf]);
      putPixel(i * 16 + 8, palette[(p >> 8) & 0xf]);
      putPixel(i * 16 + 12, palette[(p >> 12) & 0xf]);
    }
  }

  return { width, height, rgba };
}
