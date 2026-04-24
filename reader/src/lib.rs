mod cursor;
mod image;
mod lz;
mod object;
mod structs;
mod track;

use serde_bytes::ByteBuf;
use serde_wasm_bindgen::to_value;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn unpack_images(buffer: &[u8]) -> Result<JsValue, JsError> {
    let files: Vec<ByteBuf> = lz::unpack_images(buffer).into_iter().map(ByteBuf::from).collect();
    to_value(&files).map_err(Into::into)
}

#[wasm_bindgen]
pub fn decode_image(buffer: &[u8]) -> Result<JsValue, JsError> {
    to_value(&image::decode_image(buffer)).map_err(Into::into)
}

#[wasm_bindgen]
pub fn read_objects(buffer: &[u8]) -> Result<JsValue, JsError> {
    to_value(&object::read_objects(buffer)).map_err(Into::into)
}

#[wasm_bindgen]
pub fn read_track_vertices(buffer: &[u8]) -> Result<JsValue, JsError> {
    to_value(&track::read_vertices(buffer)).map_err(Into::into)
}

#[wasm_bindgen]
pub fn read_track_faces(buffer: &[u8]) -> Result<JsValue, JsError> {
    to_value(&track::read_faces(buffer)).map_err(Into::into)
}

#[wasm_bindgen]
pub fn read_track_sections(buffer: &[u8]) -> Result<JsValue, JsError> {
    to_value(&track::read_sections(buffer)).map_err(Into::into)
}

#[wasm_bindgen]
pub fn read_track_texture_index(buffer: &[u8]) -> Result<JsValue, JsError> {
    to_value(&track::read_texture_index(buffer)).map_err(Into::into)
}

#[wasm_bindgen]
pub fn read_track_textures(buffer: &[u8]) -> Result<JsValue, JsError> {
    to_value(&track::read_track_textures(buffer)).map_err(Into::into)
}
