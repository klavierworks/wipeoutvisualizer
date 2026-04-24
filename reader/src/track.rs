use crate::cursor::Cursor;
use crate::structs::{TrackFace, TrackSection, TrackTexture, TrackTextureIndex, TrackVertex};

const TRACK_VERTEX_SIZE: usize = 16;
const TRACK_FACE_SIZE: usize = 20;
const TRACK_SECTION_SIZE: usize = 156;
const TRACK_TEXTURE_INDEX_SIZE: usize = 42;
const TRACK_TEXTURE_SIZE: usize = 2;

pub fn read_vertices(buffer: &[u8]) -> Vec<TrackVertex> {
    count_from(buffer, TRACK_VERTEX_SIZE)
        .map(|mut cur| TrackVertex {
            x: cur.i32_be(),
            y: cur.i32_be(),
            z: cur.i32_be(),
        })
        .collect()
}

pub fn read_faces(buffer: &[u8]) -> Vec<TrackFace> {
    count_from(buffer, TRACK_FACE_SIZE)
        .map(|mut cur| TrackFace {
            indices: [cur.u16_be(), cur.u16_be(), cur.u16_be(), cur.u16_be()],
            normal: [cur.i16_be(), cur.i16_be(), cur.i16_be()],
            tile: cur.u8(),
            flags: cur.u8(),
            color: cur.u32_be(),
        })
        .collect()
}

pub fn read_sections(buffer: &[u8]) -> Vec<TrackSection> {
    count_from(buffer, TRACK_SECTION_SIZE)
        .map(|mut cur| {
            let next_junction = cur.i32_be();
            let previous = cur.i32_be();
            let next = cur.i32_be();
            let x = cur.i32_be();
            let y = cur.i32_be();
            let z = cur.i32_be();
            cur.skip(116);
            let first_face = cur.u32_be();
            let num_faces = cur.u16_be();
            cur.skip(4);
            let flags = cur.u16_be();
            TrackSection {
                next_junction,
                previous,
                next,
                x,
                y,
                z,
                first_face,
                num_faces,
                flags,
            }
        })
        .collect()
}

pub fn read_texture_index(buffer: &[u8]) -> Vec<TrackTextureIndex> {
    count_from(buffer, TRACK_TEXTURE_INDEX_SIZE)
        .map(|mut cur| TrackTextureIndex {
            near: std::array::from_fn(|_| cur.u16_be()),
            med: std::array::from_fn(|_| cur.u16_be()),
            far: [cur.u16_be()],
        })
        .collect()
}

pub fn read_track_textures(buffer: &[u8]) -> Vec<TrackTexture> {
    count_from(buffer, TRACK_TEXTURE_SIZE)
        .map(|mut cur| TrackTexture {
            tile: cur.u8(),
            flags: cur.u8(),
        })
        .collect()
}

fn count_from<'a>(buffer: &'a [u8], stride: usize) -> impl Iterator<Item = Cursor<'a>> {
    let count = buffer.len() / stride;
    (0..count).map(move |i| Cursor::at(buffer, i * stride))
}
