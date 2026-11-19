"""Render eight camera angles of the detective and its walk cycle for Canvas2D."""
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageColor

W, H, SCALE = 90, 65, 3
OUTPUT_SCALE = 2 if '--2x' in sys.argv else 1
FRAME_W, FRAME_H = W * OUTPUT_SCALE, H * OUTPUT_SCALE
Y, X = np.mgrid[:H*SCALE, :W*SCALE] / SCALE
X = X - W/2
Y = H - Y - 5

FUR='#835d50'
SHADE='#58392f'
CREAM='#e5c2a0'
PAW='#ebd2ab'
SCARF='#a97735'

def render(angle, phase):
    frame=np.zeros((*X.shape,4),dtype=np.uint8)
    depth=np.full(X.shape,-9999.)
    # The player faces +X at rest. At camera heading zero, look toward its back.
    c,s=np.cos(angle),np.sin(angle)
    eye=np.array([c*.95,.313,s*.95])
    eye/=np.linalg.norm(eye)
    right=np.array([s,0,-c])
    up=np.cross(eye,right)
    film=X[...,None]*right+Y[...,None]*up

    def oval(color,loc,radii,lean=0):
        loc=np.array(loc)
        ct,st=np.cos(lean),np.sin(lean)
        rotate=np.array([[ct,-st,0],[st,ct,0],[0,0,1]])
        scaled=(film-loc)@rotate
        sight=eye@rotate
        stretch=1/np.square(radii)
        A=np.dot(sight*stretch,sight)
        B=np.sum(scaled*sight*stretch,axis=-1)
        C=np.sum(scaled*scaled*stretch,axis=-1)-1
        disc=B*B-A*C
        distance=(-B+np.sqrt(np.maximum(disc,0)))/A
        mask=(disc>0)&(distance>depth)
        if not mask.any(): return
        local=(scaled[mask]+distance[mask,None]*sight)*stretch
        normals=local@rotate.T
        normals/=np.maximum(np.linalg.norm(normals,axis=-1,keepdims=True),.001)
        light=np.array([-.36,.78,.51])
        lighting=.51+np.maximum(0,normals@light)*.58
        hair=1+.023*np.sin(X[mask]*21+Y[mask]*14)+.018*np.sin(X[mask]*9-Y[mask]*12)
        base=np.asarray(ImageColor.getrgb(color))
        frame[mask,:3]=np.clip(base*lighting[:,None]*hair[:,None]+[6,3,2],0,255)
        frame[mask,3]=255
        depth[mask]=distance[mask]

    bob=(1-np.cos(phase*2))*.54
    for i in range(14):
        t=i/13
        oval(CREAM if t>.88 else SHADE,(-15-16*t,24+15*t*t+bob,np.sin(t*3+phase)*t*5),(3-t,3.1-t,3.3-t))
    for i,(x,z) in enumerate(((12,-5),(-12,-5),(12,5),(-12,5))):
        t=(phase/(2*np.pi)+[0,.52,.5,.02][i])%1
        if t<.70: stride,lift=6.5-13*t/.70,0
        else:
            f=(t-.70)/.30
            stride=-6.5+13*f*f*(3-2*f)
            lift=3.3*np.sin(np.pi*f)
        oval(FUR,(x+stride*.30,11+lift*.38,z),(3.7,8,4),stride*-.043)
        oval(FUR,(x+stride*.76,5.7+lift*.72,z),(3,5.4,3.4),stride*.04)
        oval(PAW,(x+stride+.9,2.8+lift,z),(4.3,2.8,3.4))
    oval(FUR,(-3,18+bob,0),(20,10.5,9.6))
    oval(FUR,(-13,18.7+bob,0),(11,11,9))
    oval(CREAM,(8,15+bob,0),(11.4,6.7,8.7))
    for x in (-12,-6,0,6):
        for z in (-1,1):
            oval(SHADE,(x,24.5+bob,z*4.8),(1.6,2.45,3.4),.47)
    oval(SCARF,(13,22.1+bob,0),(4,7.4,8.2),-.55)
    oval(FUR,(19,28+bob,0),(10,8.6,8.3))
    for z in (-5,5):
        oval(SHADE,(15.6,36.1+bob,z),(3.9,6,3.1),.37)
        oval('#af786f',(16.7,36+bob,z),(2.35,4.75,2),.33)
        oval(CREAM,(24,23+bob,z*.62),(5.3,3.5,3.9))
        oval('#a0a371',(23.9,29+bob,z*1.18),(2.45,2.2,1.9),.14)
        oval('#282218',(24.9,29+bob,z*1.31),(1.05,1.63,1.04),.14)
        oval('#e6d0aa',(25,29.9+bob,z*1.41),(.47,.48,.49))
    oval('#9c625b',(28.6,25+bob,0),(1.4,1,2))
    oval(SHADE,(16.9,34.9+bob,0),(7.9,1.8,7.5),-.09)
    oval('#47362c',(17.1,36.6+bob,0),(6.3,2.05,6.2),-.09)
    return Image.fromarray(frame).resize((FRAME_W,FRAME_H),Image.Resampling.LANCZOS)

sheet=Image.new('RGBA',(FRAME_W*6,FRAME_H*8))
for heading in range(8):
    angle=np.pi-heading*np.pi/4
    for i in range(6):
        sheet.paste(render(angle,i*np.pi/3),(i*FRAME_W,heading*FRAME_H))
filename='hero-frames-2x.webp' if OUTPUT_SCALE==2 else 'hero-frames.webp'
sheet.save(Path(__file__).resolve().parents[1]/'public/art'/filename, quality=88,method=6)
