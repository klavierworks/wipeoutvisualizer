use crate::cursor::Cursor;
use crate::structs::{
    DecodedImage, IMAGE_TYPE_PALETTED_4_BPP, IMAGE_TYPE_PALETTED_8_BPP,
    IMAGE_TYPE_TRUE_COLOR_16_BPP,
};

pub fn decode_image(buffer: &[u8]) -> DecodedImage {
    let mut cur = Cursor::new(buffer);

    let _magic = cur.u32_le();
    let image_type = cur.u32_le();
    let _header_length = cur.u32_le();
    let _palette_x = cur.u16_le();
    let _palette_y = cur.u16_le();
    let palette_colors = cur.u16_le() as usize;
    let _palettes = cur.u16_le();

    let palette = if matches!(
        image_type,
        IMAGE_TYPE_PALETTED_4_BPP | IMAGE_TYPE_PALETTED_8_BPP
    ) {
        Some(read_palette(&mut cur, palette_colors))
    } else {
        None
    };

    cur.skip(4);

    let _skip_x = cur.u16_le();
    let _skip_y = cur.u16_le();
    let raw_width = cur.u16_le() as usize;
    let height = cur.u16_le() as usize;

    let pixels_per_short = match image_type {
        IMAGE_TYPE_PALETTED_8_BPP => 2,
        IMAGE_TYPE_PALETTED_4_BPP => 4,
        _ => 1,
    };
    let width = raw_width * pixels_per_short;
    let entries = raw_width * height;
    let rgba = decode_pixels(&mut cur, image_type, entries, palette.as_deref());

    DecodedImage {
        width: width as u32,
        height: height as u32,
        rgba,
    }
}

fn read_palette(cur: &mut Cursor, colors: usize) -> Vec<u16> {
    (0..colors).map(|_| cur.u16_le()).collect()
}

fn decode_pixels(
    cur: &mut Cursor,
    image_type: u32,
    entries: usize,
    palette: Option<&[u16]>,
) -> Vec<u8> {
    let pixels_per_short = match image_type {
        IMAGE_TYPE_PALETTED_8_BPP => 2,
        IMAGE_TYPE_PALETTED_4_BPP => 4,
        _ => 1,
    };
    let mut rgba = vec![0u8; entries * pixels_per_short * 4];

    match image_type {
        IMAGE_TYPE_TRUE_COLOR_16_BPP => {
            for i in 0..entries {
                let c = cur.u16_le();
                put_pixel(&mut rgba, i * 4, c);
            }
        }
        IMAGE_TYPE_PALETTED_8_BPP => {
            let pal = palette.expect("palette required for 8bpp");
            for i in 0..entries {
                let p = cur.u16_le();
                put_pixel(&mut rgba, i * 8, pal[(p & 0xff) as usize]);
                put_pixel(&mut rgba, i * 8 + 4, pal[((p >> 8) & 0xff) as usize]);
            }
        }
        IMAGE_TYPE_PALETTED_4_BPP => {
            let pal = palette.expect("palette required for 4bpp");
            for i in 0..entries {
                let p = cur.u16_le();
                put_pixel(&mut rgba, i * 16, pal[(p & 0xf) as usize]);
                put_pixel(&mut rgba, i * 16 + 4, pal[((p >> 4) & 0xf) as usize]);
                put_pixel(&mut rgba, i * 16 + 8, pal[((p >> 8) & 0xf) as usize]);
                put_pixel(&mut rgba, i * 16 + 12, pal[((p >> 12) & 0xf) as usize]);
            }
        }
        _ => {}
    }
    rgba
}

fn put_pixel(dst: &mut [u8], offset: usize, color: u16) {
    dst[offset] = ((color & 0x1f) << 3) as u8;
    dst[offset + 1] = (((color >> 5) & 0x1f) << 3) as u8;
    dst[offset + 2] = (((color >> 10) & 0x1f) << 3) as u8;
    dst[offset + 3] = if color == 0 { 0 } else { 0xff };
}
