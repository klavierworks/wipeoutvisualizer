use crate::cursor::Cursor;

pub fn unpack_images(buffer: &[u8]) -> Vec<Vec<u8>> {
    let mut header = Cursor::new(buffer);
    let file_count = header.u32_le() as usize;

    let lengths: Vec<usize> = (0..file_count).map(|_| header.u32_le() as usize).collect();
    let unpacked_len: usize = lengths.iter().sum();

    let packed = &buffer[(file_count + 1) * 4..];
    let unpacked = decompress(packed, unpacked_len);

    let mut files = Vec::with_capacity(file_count);
    let mut offset = 0;
    for len in lengths {
        files.push(unpacked[offset..offset + len].to_vec());
        offset += len;
    }
    files
}

fn decompress(src: &[u8], expected_len: usize) -> Vec<u8> {
    let mut dst = Vec::with_capacity(expected_len);
    let mut wnd = vec![0u8; 0x2000];
    let mut wnd_pos: usize = 1;

    let mut reader = BitReader::new(src);

    loop {
        if reader.src_overflowed() || dst.len() > expected_len {
            break;
        }
        let literal = reader.read_bit();
        if literal {
            let byte = reader.read_bitfield(0x80) as u8;
            wnd[wnd_pos & 0x1fff] = byte;
            dst.push(byte);
            wnd_pos += 1;
        } else {
            let position = reader.read_bitfield(0x1000) as usize;
            if position == 0 {
                break;
            }
            let length = reader.read_bitfield(0x08) as usize + 2;
            for i in 0..=length {
                let byte = wnd[(i + position) & 0x1fff];
                wnd[wnd_pos & 0x1fff] = byte;
                dst.push(byte);
                wnd_pos += 1;
            }
        }
    }
    dst
}

struct BitReader<'a> {
    src: &'a [u8],
    pos: usize,
    cur: u8,
    mask: u8,
}

impl<'a> BitReader<'a> {
    fn new(src: &'a [u8]) -> Self {
        Self {
            src,
            pos: 0,
            cur: 0,
            mask: 0x80,
        }
    }

    fn src_overflowed(&self) -> bool {
        self.pos > self.src.len()
    }

    fn refill_if_needed(&mut self) {
        if self.mask == 0x80 {
            self.cur = *self.src.get(self.pos).unwrap_or(&0);
            self.pos += 1;
        }
    }

    fn advance_mask(&mut self) {
        self.mask >>= 1;
        if self.mask == 0 {
            self.mask = 0x80;
        }
    }

    fn read_bit(&mut self) -> bool {
        self.refill_if_needed();
        let bit = self.cur & self.mask != 0;
        self.advance_mask();
        bit
    }

    fn read_bitfield(&mut self, initial: u32) -> u32 {
        let mut value = 0u32;
        let mut size = initial;
        while size > 0 {
            self.refill_if_needed();
            if self.cur & self.mask != 0 {
                value |= size;
            }
            size >>= 1;
            self.advance_mask();
        }
        value
    }
}
