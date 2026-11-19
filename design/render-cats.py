"""Render the software fallback for the animated cats; requires numpy and Pillow."""
from pathlib import Path
import re
import numpy as np
from PIL import Image, ImageColor

ROOT = Path(__file__).resolve().parents[1]
COLORS = re.findall(r"fur:'(#[a-f0-9]+)', dark:'(#[a-f0-9]+)', cream:'(#[a-f0-9]+)', eyes:'(#[a-f0-9]+)'",
                    (ROOT / "src/case.js").read_text())
WIDTH, HEIGHT, SCALE, FRAMES = 90, 65, 2, 6
Y, X = np.mgrid[:HEIGHT*SCALE, :WIDTH*SCALE] / SCALE
X = X - WIDTH / 2
Y = HEIGHT - Y - 5


def render(colors, frame, parcel):
    fur, dark, cream, eyes = colors
    result = np.zeros((*X.shape, 4), dtype=np.uint8)
    depth = np.full(X.shape, -np.inf)
    phase = frame * np.pi / 3
    floor = ((X+1)/34)**2 + ((Y+1)/4.5)**2
    result[:, :, :3] = (39, 28, 20)
    result[:, :, 3] = (np.exp(-floor * 3) * 92).astype(np.uint8)

    def mesh(color, pos, scale, angle=0):
        cx, cy, cz = pos
        rx, ry, rz = scale
        dx, dy = X-cx, Y-cy
        c, s = np.cos(angle), np.sin(angle)
        x = (dx*c + dy*s)/rx
        y = (-dx*s + dy*c)/ry
        disk = 1-x*x-y*y
        z = np.sqrt(np.maximum(disk, 0))
        new_depth = cz + z*rz
        mask = (disk > 0) & (new_depth > depth)
        # Normals from the ellipsoid and a warm key light above the camera.
        nx, ny, nz = x/rx, y/ry, z/rz
        facing = (((nx*c-ny*s)*-.43 + (nx*s+ny*c)*.64 + nz*.68)
                  / np.maximum(np.sqrt(nx*nx+ny*ny+nz*nz), .001))
        light = .57 + .48 * np.clip(facing, 0, 1)
        rgb = np.asarray(ImageColor.getrgb(color))
        color_values = np.clip(rgb * light[mask, None] + [8, 4, 1], 0, 255)
        depth[mask] = new_depth[mask]
        result[mask, :3] = color_values.astype(np.uint8)
        result[mask, 3] = 255

    bounce = abs(np.sin(phase))*2
    for i in range(10):
        f = i/9
        mesh(dark if i > 7 else fur,
             (-17-16*f, 18+17*f*f+np.sin(phase)*f*3+bounce, 1+f*3),
             (3.2-f*.65, 3.2-f*.65, 3.7-f))
    for i, (x, z) in enumerate(((-12,-3),(-12,5),(12,-3),(12,5))):
        swing = np.sin(phase + (0 if i in (0,3) else np.pi))
        mesh(fur if z > 0 else dark, (x+swing*1.9, 9+bounce,z), (4,9,3.5), swing*.45)
        mesh(cream, (x+3*swing+1,2+max(0,swing)*2+bounce,z+.6), (5,3,4))
    mesh(fur, (-2,18+bounce,0), (21,14,12))
    mesh(cream, (1,12+bounce,7), (16,8,7))
    for x in (-13, -7, -1):
        mesh(dark, (x,26+bounce,6), (2.7,6,4.4), .38)
    mesh(fur, (15,24+bounce,3), (12.4,12,10.7))
    mesh(dark,(10,34+bounce,4),(4,8,4),.4)
    mesh(fur,(20,34+bounce,7),(4.1,8.2,4.4),-.35)
    mesh('#af7467',(21,35+bounce,10),(2.2,5,2.1),-.35)
    mesh(cream,(21,19+bounce,8),(8,5,6.6))
    mesh(eyes,(20,26+bounce,11.5),(3.3,3.7,2.1))
    mesh('#241e19',(21,26+bounce,13.3),(1.2,3.1,1))
    mesh('#fff2d4',(20.7,27.8+bounce,14),(1,.8,.7))
    mesh('#9a5a50',(27,22+bounce,10),(2.7,1.6,2.1))
    if parcel:
        mesh('#dbab64',(31,17+bounce,11),(8.4,5.5,5),.18)
        mesh('#84432f',(31,17+bounce,15),(1.3,5.4,1.2),.18)
    return Image.fromarray(result).resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


sheet = Image.new('RGBA', (WIDTH*FRAMES*2, HEIGHT*len(COLORS)))
for i, colors in enumerate(COLORS):
    for packed in (False, True):
        for frame in range(FRAMES):
            sheet.paste(render(colors, frame, packed), ((frame+FRAMES*int(packed))*WIDTH, i*HEIGHT))
sheet.save(ROOT / 'public/art/cat-frames.webp', quality=88, method=6)
