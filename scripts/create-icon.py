#!/usr/bin/env python3
"""アイコン画像 (build/icon.png) を生成するスクリプト。外部ライブラリ不要。"""
import struct, zlib, math, os

SIZE = 1024

def pack_chunk(name, data):
    return (struct.pack('>I', len(data)) + name + data +
            struct.pack('>I', zlib.crc32(name + data) & 0xffffffff))

def write_rgba_png(filename, size, pixels):
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = pack_chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    raw = bytearray()
    for y in range(size):
        raw += b'\x00'
        raw += bytes(pixels[y * size * 4:(y + 1) * size * 4])
    idat = pack_chunk(b'IDAT', zlib.compress(bytes(raw), 6))
    iend = pack_chunk(b'IEND', b'')
    with open(filename, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

def clamp(v):
    return max(0, min(255, int(v)))

def lerp(a, b, t):
    return a + (b - a) * t

def lerp_color(c1, c2, t):
    return tuple(clamp(lerp(c1[i], c2[i], t)) for i in range(len(c1)))

def smooth_step(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)

def make_icon(size):
    pixels = bytearray(size * size * 4)
    aa = 1.5 / size  # アンチエイリアス幅

    for y in range(size):
        for x in range(size):
            nx = (x / size) * 2 - 1  # -1..1
            ny = (y / size) * 2 - 1

            # 角丸矩形 SDF
            rw, rh = 0.84, 0.84
            cr = 0.16
            dx = max(abs(nx) - rw + cr, 0.0)
            dy = max(abs(ny) - rh + cr, 0.0)
            sdf = math.sqrt(dx * dx + dy * dy) - cr

            alpha = clamp(smooth_step(aa, -aa, sdf) * 255)
            if alpha == 0:
                continue

            # ベース: ダークネイビーグラデーション
            t_y = (ny + 1) / 2
            bg = lerp_color((18, 35, 60), (26, 50, 88), t_y)

            # ブラウザ上部クローム
            chrome_bot = -0.50
            if ny < chrome_bot and sdf < 0:
                t_c = (ny - (-rh + cr * 0.3)) / (chrome_bot - (-rh + cr * 0.3))
                bg = lerp_color((48, 88, 138), (38, 72, 118), max(0, t_c))
                # URLバー
                if -0.52 < nx < 0.52 and -0.76 < ny < -0.60:
                    bg = (65, 100, 155)

            # クロームとコンテンツの境界線
            if abs(ny - chrome_bot) < 0.012 and sdf < 0:
                bg = lerp_color(bg, (90, 155, 215), 0.8)

            angle = 0.13
            if ny > chrome_bot + 0.04 and sdf < 0:
                # 黄色ハイライト1 (太め)
                d1 = abs(ny - nx * angle - 0.10)
                if d1 < 0.092:
                    blend = smooth_step(0.092, 0.0, d1) * 0.78
                    bg = lerp_color(bg, (255, 218, 0), blend)

                # 黄色ハイライト2 (細め・平行)
                d2 = abs(ny - nx * angle + 0.14)
                if d2 < 0.064:
                    blend = smooth_step(0.064, 0.0, d2) * 0.62
                    bg = lerp_color(bg, (255, 218, 0), blend)

                # 赤いアノテーション
                d3 = abs(ny - nx * angle + 0.36)
                if d3 < 0.050:
                    blend = smooth_step(0.050, 0.0, d3) * 0.72
                    bg = lerp_color(bg, (228, 68, 68), blend)

            # 内側シャドウ (エッジを締める)
            shadow = smooth_step(-0.04, 0.04, sdf) * 0.35
            bg = lerp_color(bg, (0, 0, 0), shadow)

            off = (y * size + x) * 4
            pixels[off]     = clamp(bg[0])
            pixels[off + 1] = clamp(bg[1])
            pixels[off + 2] = clamp(bg[2])
            pixels[off + 3] = alpha

    return pixels

if __name__ == "__main__":
    os.makedirs("build", exist_ok=True)
    print(f"Generating {SIZE}x{SIZE} icon...")
    px = make_icon(SIZE)
    write_rgba_png("build/icon.png", SIZE, px)
    print("Created: build/icon.png")
