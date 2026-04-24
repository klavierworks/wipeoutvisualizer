use crate::cursor::Cursor;
use crate::structs::{
    ObjectHeader, Polygon, Uv, Vec3i32, Vertex, WipeoutObject, POLYGON_FLAT_QUAD_FACE_COLOR,
    POLYGON_FLAT_QUAD_VERTEX_COLOR, POLYGON_FLAT_TRIS_FACE_COLOR, POLYGON_FLAT_TRIS_VERTEX_COLOR,
    POLYGON_SPRITE_BOTTOM_ANCHOR, POLYGON_SPRITE_TOP_ANCHOR, POLYGON_TEXTURED_QUAD_FACE_COLOR,
    POLYGON_TEXTURED_QUAD_VERTEX_COLOR, POLYGON_TEXTURED_TRIS_FACE_COLOR,
    POLYGON_TEXTURED_TRIS_VERTEX_COLOR, POLYGON_UNKNOWN_00,
};

pub fn read_objects(buffer: &[u8]) -> Vec<WipeoutObject> {
    let mut cur = Cursor::new(buffer);
    let mut objects = Vec::new();
    while !cur.is_eof() {
        objects.push(read_object(&mut cur));
    }
    objects
}

fn read_object(cur: &mut Cursor) -> WipeoutObject {
    let header = read_header(cur);
    let vertices = (0..header.vertex_count).map(|_| read_vertex(cur)).collect();
    let polygons = (0..header.polygon_count).map(|_| read_polygon(cur)).collect();
    WipeoutObject {
        header,
        vertices,
        polygons,
    }
}

fn read_header(cur: &mut Cursor) -> ObjectHeader {
    let name = cur.fixed_string(15);
    cur.skip(1);
    let vertex_count = cur.u16_be();
    cur.skip(14);
    let polygon_count = cur.u16_be();
    cur.skip(20);
    let index1 = cur.u16_be();
    cur.skip(28);
    let origin = read_vec3i32(cur);
    cur.skip(20);
    let position = read_vec3i32(cur);
    cur.skip(16);
    ObjectHeader {
        name,
        vertex_count,
        polygon_count,
        index1,
        origin,
        position,
    }
}

fn read_vec3i32(cur: &mut Cursor) -> Vec3i32 {
    Vec3i32 {
        x: cur.i32_be(),
        y: cur.i32_be(),
        z: cur.i32_be(),
    }
}

fn read_vertex(cur: &mut Cursor) -> Vertex {
    let v = Vertex {
        x: cur.i16_be(),
        y: cur.i16_be(),
        z: cur.i16_be(),
    };
    cur.skip(2);
    v
}

fn read_uv(cur: &mut Cursor) -> Uv {
    Uv {
        u: cur.u8(),
        v: cur.u8(),
    }
}

fn read_uvs<const N: usize>(cur: &mut Cursor) -> [Uv; N] {
    std::array::from_fn(|_| read_uv(cur))
}

fn read_u16s<const N: usize>(cur: &mut Cursor) -> [u16; N] {
    std::array::from_fn(|_| cur.u16_be())
}

fn read_u32s<const N: usize>(cur: &mut Cursor) -> [u32; N] {
    std::array::from_fn(|_| cur.u32_be())
}

fn read_polygon(cur: &mut Cursor) -> Polygon {
    let kind = cur.u16_be();
    let subtype = cur.u16_be();

    match kind {
        POLYGON_FLAT_TRIS_FACE_COLOR => {
            let indices = read_u16s::<3>(cur);
            cur.skip(2);
            let color = cur.u32_be();
            Polygon::FlatTrisFaceColor {
                subtype,
                indices,
                color,
            }
        }
        POLYGON_TEXTURED_TRIS_FACE_COLOR => {
            let indices = read_u16s::<3>(cur);
            let texture = cur.u16_be();
            cur.skip(4);
            let uv = read_uvs::<3>(cur);
            cur.skip(2);
            let color = cur.u32_be();
            Polygon::TexturedTrisFaceColor {
                subtype,
                indices,
                texture,
                uv,
                color,
            }
        }
        POLYGON_FLAT_QUAD_FACE_COLOR => {
            let indices = read_u16s::<4>(cur);
            let color = cur.u32_be();
            Polygon::FlatQuadFaceColor {
                subtype,
                indices,
                color,
            }
        }
        POLYGON_TEXTURED_QUAD_FACE_COLOR => {
            let indices = read_u16s::<4>(cur);
            let texture = cur.u16_be();
            cur.skip(4);
            let uv = read_uvs::<4>(cur);
            cur.skip(2);
            let color = cur.u32_be();
            Polygon::TexturedQuadFaceColor {
                subtype,
                indices,
                texture,
                uv,
                color,
            }
        }
        POLYGON_FLAT_TRIS_VERTEX_COLOR => {
            let indices = read_u16s::<3>(cur);
            cur.skip(2);
            let colors = read_u32s::<3>(cur);
            Polygon::FlatTrisVertexColor {
                subtype,
                indices,
                colors,
            }
        }
        POLYGON_TEXTURED_TRIS_VERTEX_COLOR => {
            let indices = read_u16s::<3>(cur);
            let texture = cur.u16_be();
            cur.skip(4);
            let uv = read_uvs::<3>(cur);
            cur.skip(2);
            let colors = read_u32s::<3>(cur);
            Polygon::TexturedTrisVertexColor {
                subtype,
                indices,
                texture,
                uv,
                colors,
            }
        }
        POLYGON_FLAT_QUAD_VERTEX_COLOR => {
            let indices = read_u16s::<4>(cur);
            let colors = read_u32s::<4>(cur);
            Polygon::FlatQuadVertexColor {
                subtype,
                indices,
                colors,
            }
        }
        POLYGON_TEXTURED_QUAD_VERTEX_COLOR => {
            let indices = read_u16s::<4>(cur);
            let texture = cur.u16_be();
            cur.skip(4);
            let uv = read_uvs::<4>(cur);
            cur.skip(2);
            let colors = read_u32s::<4>(cur);
            Polygon::TexturedQuadVertexColor {
                subtype,
                indices,
                texture,
                uv,
                colors,
            }
        }
        POLYGON_SPRITE_TOP_ANCHOR | POLYGON_SPRITE_BOTTOM_ANCHOR => {
            let index = cur.u16_be();
            let width = cur.u16_be();
            let height = cur.u16_be();
            let texture = cur.u16_be();
            let color = cur.u32_be();
            if kind == POLYGON_SPRITE_TOP_ANCHOR {
                Polygon::SpriteTopAnchor {
                    subtype,
                    index,
                    width,
                    height,
                    texture,
                    color,
                }
            } else {
                Polygon::SpriteBottomAnchor {
                    subtype,
                    index,
                    width,
                    height,
                    texture,
                    color,
                }
            }
        }
        POLYGON_UNKNOWN_00 => {
            cur.skip(14);
            Polygon::Unknown00 { subtype }
        }
        other => panic!("unknown polygon type {:#x}", other),
    }
}
