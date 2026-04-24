pub struct Cursor<'a> {
    bytes: &'a [u8],
    pos: usize,
}

impl<'a> Cursor<'a> {
    pub fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, pos: 0 }
    }

    pub fn at(bytes: &'a [u8], pos: usize) -> Self {
        Self { bytes, pos }
    }

    pub fn is_eof(&self) -> bool {
        self.pos >= self.bytes.len()
    }

    pub fn skip(&mut self, n: usize) {
        self.pos += n;
    }

    fn take<const N: usize>(&mut self) -> [u8; N] {
        let slice = &self.bytes[self.pos..self.pos + N];
        self.pos += N;
        slice.try_into().unwrap()
    }

    pub fn u8(&mut self) -> u8 {
        let b = self.bytes[self.pos];
        self.pos += 1;
        b
    }

    pub fn u16_be(&mut self) -> u16 {
        u16::from_be_bytes(self.take())
    }

    pub fn u16_le(&mut self) -> u16 {
        u16::from_le_bytes(self.take())
    }

    pub fn i16_be(&mut self) -> i16 {
        i16::from_be_bytes(self.take())
    }

    pub fn u32_be(&mut self) -> u32 {
        u32::from_be_bytes(self.take())
    }

    pub fn u32_le(&mut self) -> u32 {
        u32::from_le_bytes(self.take())
    }

    pub fn i32_be(&mut self) -> i32 {
        i32::from_be_bytes(self.take())
    }

    pub fn fixed_string(&mut self, len: usize) -> String {
        let end = self.bytes[self.pos..self.pos + len]
            .iter()
            .position(|&b| b == 0)
            .unwrap_or(len);
        let s = String::from_utf8_lossy(&self.bytes[self.pos..self.pos + end]).into_owned();
        self.pos += len;
        s
    }
}
