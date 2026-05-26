#!/usr/bin/env python3
"""
アイコン画像を生成するスクリプト。外部ライブラリ不要。
- build/icon.png  (1024×1024, macOS / Linux 用)
- build/icon.ico  (256/48/32/16px 埋め込み, Windows 用)
"""
import struct, zlib, math, os

SIZE = 1024

# ── PNG 生成ユーティリティ ─────────────────────────────────────────────────

def pack_chunk(name, data):
    return (struct.pack('>I', len(data)) + name + data +
            struct.pack('>I', zlib.crc32(name + data) & 0xffffffff))

def pixels_to_png_bytes(size, pixels):
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = pack_chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    raw = bytearray()
    for y in range(size):
        raw += b'\x00'
        raw += bytes(pixels[y * size * 4:(y + 1) * size * 4])
    idat = pack_chunk(b'IDAT', zlib.compress(bytes(raw), 6))
    iend = pack_chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

def write_rgba_png(filename, size, pixels):
    with open(filename, 'wb') as f:
        f.write(pixels_to_png_bytes(size, pixels))

# ── 画像処理ユーティリティ ────────────────────────────────────────────────

def clamp(v):
    return max(0, min(255, int(v)))

def lerp(a, b, t):
    return a + (b - a) * t

def lerp_color(c1, c2, t):
    return tuple(clamp(lerp(c1[i], c2[i], t)) for i in range(len(c1)))

def smooth_step(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)

def resize_pixels(src, src_size, dst_size):
    """ボックスフィルタでリサイズ"""
    dst = bytearray(dst_size * dst_size * 4)
    scale = src_size / dst_size
    for y in range(dst_size):
        for x in range(dst_size):
            x0, y0 = int(x * scale), int(y * scale)
            x1, y1 = max(x0 + 1, int((x + 1) * scale)), max(y0 + 1, int((y + 1) * scale))
            r = g = b = a = cnt = 0
            for sy in range(y0, min(y1, src_size)):
                for sx in range(x0, min(x1, src_size)):
                    o = (sy * src_size + sx) * 4
                    r += src[o]; g += src[o+1]; b += src[o+2]; a += src[o+3]
                    cnt += 1
            if cnt:
                o2 = (y * dst_size + x) * 4
                dst[o2] = r // cnt; dst[o2+1] = g // cnt
                dst[o2+2] = b // cnt; dst[o2+3] = a // cnt
    return dst

# ── アイコン描画 ──────────────────────────────────────────────────────────

def make_icon(size):
    pixels = bytearray(size * size * 4)
    aa = 1.5 / size

    for y in range(size):
        for x in range(size):
            nx = (x / size) * 2 - 1
            ny = (y / size) * 2 - 1

            # 角丸矩形 SDF
            rw, rh, cr = 0.84, 0.84, 0.16
            dx = max(abs(nx) - rw + cr, 0.0)
            dy = max(abs(ny) - rh + cr, 0.0)
            sdf = math.sqrt(dx * dx + dy * dy) - cr

            alpha = clamp(smooth_step(aa, -aa, sdf) * 255)
            if alpha == 0:
                continue

            t_y = (ny + 1) / 2
            bg = lerp_color((18, 35, 60), (26, 50, 88), t_y)

            chrome_bot = -0.50
            if ny < chrome_bot and sdf < 0:
                t_c = (ny - (-rh + cr * 0.3)) / (chrome_bot - (-rh + cr * 0.3))
                bg = lerp_color((48, 88, 138), (38, 72, 118), max(0, t_c))
                if -0.52 < nx < 0.52 and -0.76 < ny < -0.60:
                    bg = (65, 100, 155)

            if abs(ny - chrome_bot) < 0.012 and sdf < 0:
                bg = lerp_color(bg, (90, 155, 215), 0.8)

            angle = 0.13
            if ny > chrome_bot + 0.04 and sdf < 0:
                d1 = abs(ny - nx * angle - 0.10)
                if d1 < 0.092:
                    bg = lerp_color(bg, (255, 218, 0), smooth_step(0.092, 0.0, d1) * 0.78)
                d2 = abs(ny - nx * angle + 0.14)
                if d2 < 0.064:
                    bg = lerp_color(bg, (255, 218, 0), smooth_step(0.064, 0.0, d2) * 0.62)
                d3 = abs(ny - nx * angle + 0.36)
                if d3 < 0.050:
                    bg = lerp_color(bg, (228, 68, 68), smooth_step(0.050, 0.0, d3) * 0.72)

            shadow = smooth_step(-0.04, 0.04, sdf) * 0.35
            bg = lerp_color(bg, (0, 0, 0), shadow)

            off = (y * size + x) * 4
            pixels[off] = clamp(bg[0]); pixels[off+1] = clamp(bg[1])
            pixels[off+2] = clamp(bg[2]); pixels[off+3] = alpha

    return pixels

# ── ICO 生成 ──────────────────────────────────────────────────────────────

def write_ico(filename, base_pixels, base_size, ico_sizes=(256, 48, 32, 16)):
    """PNG を ICO 内に埋め込む形式で ICO ファイルを生成"""
    images = []
    for s in ico_sizes:
        px = base_pixels if s == base_size else resize_pixels(base_pixels, base_size, s)
        images.append((s, pixels_to_png_bytes(s, px)))

    count = len(images)
    header = struct.pack('<HHH', 0, 1, count)
    data_offset = 6 + count * 16

    directory = b''
    image_data = b''
    for s, png in images:
        w = s if s < 256 else 0
        h = s if s < 256 else 0
        directory += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(png), data_offset)
        image_data += png
        data_offset += len(png)

    with open(filename, 'wb') as f:
        f.write(header + directory + image_data)

# ── エントリポイント ──────────────────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs("build", exist_ok=True)

    print(f"Generating {SIZE}x{SIZE} base icon...")
    px = make_icon(SIZE)

    write_rgba_png("build/icon.png", SIZE, px)
    print("Created: build/icon.png")

    write_ico("build/icon.ico", px, SIZE)
    print("Created: build/icon.ico  (256/48/32/16px)")
