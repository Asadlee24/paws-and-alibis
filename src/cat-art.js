import * as THREE from 'three';
import {cats} from './case.js';

export function portrait(cat) {
  const eyes = '<path fill="#27271e" d="M24 35h2v7h-2zm15 0h2v7h-2z"/>';
  return `<svg viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <path fill="#bd9b62" opacity=".27" d="M10 53Q3 29 20 19q20-13 34 9 7 11-1 27Z"/>
  <path fill="${cat.dark}" d="M16 30 13 9q0-3 4-1l15 14h3L48 8q4-3 4 1l-2 23q7 7 4 15-3 10-21 12-19-1-24-11-4-9 7-18Z"/>
  <path fill="${cat.fur}" d="M17 31 17 12l13 13h6l13-13-2 21q8 6 5 13-3 10-19 10-16-1-21-9-3-8 5-16Z"/>
  <path fill="#9e604f" opacity=".75" d="m19 16 9 10-8 3zm28 0-9 10 8 3z"/>
  <path fill="${cat.dark}" opacity=".77" d="M27 25q2-2 4-2l1 10zm12 0q-2-2-4-2l-1 10z" />
  <path fill="${cat.cream}" d="M13 43q7-3 14-4 3-4 6-4t6 4q7 1 12 4 0 11-18 13-16-1-20-13Z"/>
  <ellipse cx="24" cy="38" rx="4.5" ry="4" fill="${cat.eyes}"/><ellipse cx="41" cy="38" rx="4.5" ry="4" fill="${cat.eyes}"/>${eyes}
  <path fill="#61413b" d="M29 44q4-2 8 0l-4 4z"/><path d="M33 47v2m0 0q-3 3-5 0m5 0q3 3 5 0" fill="none" stroke="#61413b" stroke-width="1.1" stroke-linecap="round"/>
  <path d="m20 45-8-1m7 4-7 1m34-4 8-1m-8 4 7 1" stroke="#514535" opacity=".67" stroke-width=".8" stroke-linecap="round"/>
  </svg>`;
}

const sphere = new THREE.SphereGeometry(1, 14, 10);
const ear = new THREE.ConeGeometry(1, 1, 5);
function makeMaterial(color) {
  return new THREE.MeshStandardMaterial({color, roughness:.86});
}
function shape(parent, geometry, material, pos, dims) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...pos);
  mesh.scale.set(...dims);
  parent.add(mesh);
  return mesh;
}
function sculpt(cat, scene) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  scene.add(root);
  const fur = makeMaterial(cat.fur), dark = makeMaterial(cat.dark), cream = makeMaterial(cat.cream);
  const pink = makeMaterial('#ac7064'), pupil = makeMaterial('#211e1b'), iris = makeMaterial(cat.eyes);
  const ell = (m,p,s,g=body) => shape(g,sphere,m,p,s);
  ell(fur,[-1,12,0],[16,12,8]);
  ell(cream,[4,9,4],[10,7,6]);
  ell(dark,[-6,19,2],[2.8,2.6,7]).rotation.z=-.25;
  ell(dark,[-11,16,4],[2.4,1.9,6]).rotation.z=-.22;
  ell(dark,[-3,20,1],[2,2,7]).rotation.z=-.17;
  const head = new THREE.Group();
  head.position.set(13,20,1);
  body.add(head);
  ell(fur,[0,0,0],[11.1,10.4,9.3],head);
  ell(dark,[-1,5,6],[3,3,4],head);
  for (const sign of [-1,1]) {
    const tip = shape(head,ear,dark,[-2,10,sign*6],[4.9,11.7,4.5]);
    tip.rotation.z=.16;
    const lining = shape(head,ear,pink,[.5,10.3,sign*7],[3.3,7.2,2.8]);
    lining.rotation.z=.16;
  }
  ell(cream,[7,-3,3],[5.7,4.1,6.2],head);
  ell(iris,[6,1.9,7.6],[2.6,2.9,1.8],head);
  ell(pupil,[6.4,2,8.9],[.95,2.3,.7],head);
  ell(cream,[6.4,3.2,9.3],[.6,.5,.4],head);
  ell(pink,[11,-1.8,4.8],[1.9,1.1,1.5],head);
  const parcel = new THREE.Group();
  parcel.position.set(12,-5,7);
  head.add(parcel);
  const whitePaper=makeMaterial('#e4c182'), string=makeMaterial('#984934');
  const box = new THREE.BoxGeometry(1,1,1);
  shape(parcel,box,whitePaper,[0,0,0],[12,8,8]);
  shape(parcel,box,string,[0,0,0],[1.25,8.2,8.2]);
  shape(parcel,box,string,[0,0,0],[12.2,8.2,1.1]);
  parcel.rotation.z=-.2;
  parcel.visible=false;
  const feet = [];
  for (const x of [-11,10]) for (const z of [-4,4]) {
    const foot = new THREE.Group();
    foot.position.set(x,9,z);
    ell(z>0 ? fur:dark,[0,-4.5,0],[3.2,6.8,3.1],foot);
    ell(cream,[1,-9.6,.4],[3.6,2.45,3],foot);
    body.add(foot);
    feet.push(foot);
  }
  const tail = new THREE.Group();
  tail.position.set(-13,15,0);
  body.add(tail);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0,0),new THREE.Vector3(-7,2,0),new THREE.Vector3(-14,7,1),new THREE.Vector3(-17,16,3)
  ]);
  shape(tail,new THREE.TubeGeometry(curve,9,2,6,false),fur,[0,0,0],[1,1,1]);
  ell(dark,[-17,16,3],[2.2,2.6,2.2],tail);
  const shadow = shape(root,sphere,new THREE.MeshBasicMaterial({color:'#252018',opacity:.28,transparent:true,depthWrite:false}),[0,0,-11],[21,3,1]);
  shadow.renderOrder=-1;
  return {root,body,head,feet,tail,parcel};
}

export function makeScene(container) {
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0,1,1,0,.1,500);
  camera.position.z=150;
  const sun = new THREE.DirectionalLight('#ffcf9d', 2.2);
  sun.position.set(-75,120,150);
  scene.add(sun,new THREE.HemisphereLight('#fff0d2','#514831',1.75));
  const models = cats.map(cat => sculpt(cat,scene));
  let width=1, height=1;
  function resize() {
    width=container.clientWidth;
    height=container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width,height,false);
    camera.right=width;
    camera.top=height;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(container);
  return (positions,time,playing,culprit) => {
    models.forEach(({root,body,head,feet,tail,parcel},i) => {
      const p=positions[i];
      parcel.visible=culprit===i;
      const phase=time*16+i*1.2;
      const stride=p.moving && playing ? .41 : .06;
      const scale=Math.max(.5, Math.min(1.1,width/980))*(.65+p.y*.5);
      root.position.set(p.x*width,(1-p.y)*height,Math.round(p.y*30));
      root.scale.set(p.direction*scale,scale,scale);
      body.position.y=Math.abs(Math.sin(phase))*stride*4;
      body.rotation.y=p.direction*.08;
      head.rotation.z=Math.sin(time*2+i)*.07;
      feet.forEach((foot,j) => {foot.rotation.z=Math.sin(phase+(j === 0 || j === 3 ? 0 : Math.PI))*stride;});
      tail.rotation.z=Math.sin(time*4+i)*.21;
      tail.rotation.y=Math.sin(time*2+i)*.14;
    });
    renderer.render(scene,camera);
  };
}
