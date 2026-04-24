use serde::Serialize;

#[derive(Serialize, Clone, Copy)]
pub struct Vec3i32 {
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

#[derive(Serialize, Clone, Copy)]
pub struct Vertex {
    pub x: i16,
    pub y: i16,
    pub z: i16,
}

#[derive(Serialize, Clone, Copy)]
pub struct TrackVertex {
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

#[derive(Serialize, Clone, Copy)]
pub struct Uv {
    pub u: u8,
    pub v: u8,
}

#[derive(Serialize, Clone)]
pub struct ObjectHeader {
    pub name: String,
    pub vertex_count: u16,
    pub polygon_count: u16,
    pub index1: u16,
    pub origin: Vec3i32,
    pub position: Vec3i32,
}

#[derive(Serialize, Clone)]
pub struct TrackFace {
    pub indices: [u16; 4],
    pub normal: [i16; 3],
    pub tile: u8,
    pub flags: u8,
    pub color: u32,
}

#[derive(Serialize, Clone)]
pub struct TrackTextureIndex {
    pub near: [u16; 16],
    pub med: [u16; 4],
    pub far: [u16; 1],
}

#[derive(Serialize, Clone)]
pub struct TrackSection {
    pub next_junction: i32,
    pub previous: i32,
    pub next: i32,
    pub x: i32,
    pub y: i32,
    pub z: i32,
    pub first_face: u32,
    pub num_faces: u16,
    pub flags: u16,
}

#[derive(Serialize, Clone, Copy)]
pub struct TrackTexture {
    pub tile: u8,
    pub flags: u8,
}

pub const POLYGON_UNKNOWN_00: u16 = 0x00;
pub const POLYGON_FLAT_TRIS_FACE_COLOR: u16 = 0x01;
pub const POLYGON_TEXTURED_TRIS_FACE_COLOR: u16 = 0x02;
pub const POLYGON_FLAT_QUAD_FACE_COLOR: u16 = 0x03;
pub const POLYGON_TEXTURED_QUAD_FACE_COLOR: u16 = 0x04;
pub const POLYGON_FLAT_TRIS_VERTEX_COLOR: u16 = 0x05;
pub const POLYGON_TEXTURED_TRIS_VERTEX_COLOR: u16 = 0x06;
pub const POLYGON_FLAT_QUAD_VERTEX_COLOR: u16 = 0x07;
pub const POLYGON_TEXTURED_QUAD_VERTEX_COLOR: u16 = 0x08;
pub const POLYGON_SPRITE_TOP_ANCHOR: u16 = 0x0A;
pub const POLYGON_SPRITE_BOTTOM_ANCHOR: u16 = 0x0B;

#[derive(Serialize, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Polygon {
    Unknown00 {
        subtype: u16,
    },
    FlatTrisFaceColor {
        subtype: u16,
        indices: [u16; 3],
        color: u32,
    },
    TexturedTrisFaceColor {
        subtype: u16,
        indices: [u16; 3],
        texture: u16,
        uv: [Uv; 3],
        color: u32,
    },
    FlatQuadFaceColor {
        subtype: u16,
        indices: [u16; 4],
        color: u32,
    },
    TexturedQuadFaceColor {
        subtype: u16,
        indices: [u16; 4],
        texture: u16,
        uv: [Uv; 4],
        color: u32,
    },
    FlatTrisVertexColor {
        subtype: u16,
        indices: [u16; 3],
        colors: [u32; 3],
    },
    TexturedTrisVertexColor {
        subtype: u16,
        indices: [u16; 3],
        texture: u16,
        uv: [Uv; 3],
        colors: [u32; 3],
    },
    FlatQuadVertexColor {
        subtype: u16,
        indices: [u16; 4],
        colors: [u32; 4],
    },
    TexturedQuadVertexColor {
        subtype: u16,
        indices: [u16; 4],
        texture: u16,
        uv: [Uv; 4],
        colors: [u32; 4],
    },
    SpriteTopAnchor {
        subtype: u16,
        index: u16,
        width: u16,
        height: u16,
        texture: u16,
        color: u32,
    },
    SpriteBottomAnchor {
        subtype: u16,
        index: u16,
        width: u16,
        height: u16,
        texture: u16,
        color: u32,
    },
}

#[derive(Serialize)]
pub struct WipeoutObject {
    pub header: ObjectHeader,
    pub vertices: Vec<Vertex>,
    pub polygons: Vec<Polygon>,
}

#[derive(Serialize)]
pub struct DecodedImage {
    pub width: u32,
    pub height: u32,
    #[serde(with = "serde_bytes")]
    pub rgba: Vec<u8>,
}

pub const IMAGE_TYPE_PALETTED_4_BPP: u32 = 0x08;
pub const IMAGE_TYPE_PALETTED_8_BPP: u32 = 0x09;
pub const IMAGE_TYPE_TRUE_COLOR_16_BPP: u32 = 0x02;
