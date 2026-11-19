export const duration = 24;

export const cats = [
  {name:'Chutney', coat:'Ginger tabby', fur:'#c77b45', dark:'#9a4e2b', cream:'#f3cd9b', eyes:'#467367'},
  {name:'Soot', coat:'Charcoal', fur:'#4d4c49', dark:'#242928', cream:'#a1aba0', eyes:'#cf9e49'},
  {name:'Mochi', coat:'Cream point', fur:'#e5c98c', dark:'#997459', cream:'#fff0c9', eyes:'#4e797b'},
  {name:'Saffron', coat:'Golden shorthair', fur:'#dda240', dark:'#ae7837', cream:'#f8dfa1', eyes:'#806c33'},
  {name:'Pepper', coat:'Grey tuxedo', fur:'#777d86', dark:'#4b535e', cream:'#eeebd4', eyes:'#688465'},
  {name:'Biscuit', coat:'Warm calico', fur:'#d79c76', dark:'#6d5148', cream:'#f0dfbb', eyes:'#6a7855'},
  {name:'Mint', coat:'Silver tabby', fur:'#a4a69d', dark:'#5c6763', cream:'#e9e5d9', eyes:'#537f68'},
  {name:'Nawab', coat:'Chocolate point', fur:'#8b635a', dark:'#543a36', cream:'#d9ac91', eyes:'#ac9659'},
];

export const evidence = [
  {name:'First sighting', time:5, left:'the spice counter', right:'the blue doorway', places:[[.21,.68],[.61,.65]], mark:['Spice counter','Blue doorway']},
  {name:'Crossing', time:12, left:'the rug', right:'the lantern', places:[[.32,.78],[.74,.72]], mark:['Rug','Lantern']},
  {name:'Getaway', time:19, left:'the left exit', right:'the right exit', places:[[.12,.83],[.88,.81]], mark:['Left exit','Right exit']},
];

export function side(cat, clue) {
  return (cat >> clue) & 1;
}

export function position(id, time) {
  const offsetX = id % 2 ? .021 : -.021;
  const offsetY = (id % 4 - 1.5) * .028;
  const points = [
    {at:0, x:.36 + (id % 4) * .095, y:.85 + (id > 3 ? .073 : 0)},
    ...evidence.map((clue, n) => {
      const [x,y] = clue.places[side(id,n)];
      const group = (id & ((1 << n) - 1)) + ((id >> (n + 1)) << n);
      return {at:clue.time, x:x+(group % 2 ? .027 : -.027), y:y+((group >> 1) ? .027 : -.019)};
    }),
    {at:duration, x:side(id,2) ? .95 + offsetX : .045 + offsetX, y:.91 + offsetY},
  ];
  const index = Math.max(1, points.findIndex(point => time <= point.at));
  const a = points[index - 1];
  const b = points[index];
  let progress = Math.min(1, Math.max(0, (time - a.at) / (b.at - a.at)));
  progress = progress * progress * (3 - 2 * progress);
  return {
    x:a.x+(b.x-a.x)*progress,
    y:a.y+(b.y-a.y)*progress,
    direction:b.x >= a.x ? 1 : -1,
    moving: progress > .02 && progress < .98,
  };
}

export function clueText(id, value) {
  const clue = evidence[id];
  return `At 00:${String(clue.time).padStart(2,'0')}, the thief passed ${value ? clue.right : clue.left}.`;
}

export function makePractice() {
  let culprit;
  const opened = new Set();
  let finished = false;
  return {
    async start() { culprit = crypto.getRandomValues(new Uint8Array(1))[0] & 7; opened.clear(); finished = false; },
    async clue(id) {
      if (finished) throw new Error('This case is closed.');
      opened.add(id);
      return side(culprit, id);
    },
    async accuse(id) {
      if (finished) throw new Error('This case is closed.');
      finished = true;
      return {culprit, correct:culprit === id, clues:opened.size, score:culprit === id ? 300 - opened.size * 75 : 0};
    },
  };
}
