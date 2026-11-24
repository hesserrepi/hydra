// A superformula outline that morphs on its own through stars, flowers and blobs, with echo layers lagging behind.
// superformula() and superbloom() load automatically; their inputs are documented in
// public/extensions/curves/lib-superformula.js.
superbloom(
  6,     // m: symmetry the outline circles around
  2.5,   // how far m wanders
  1.2,   // n1: low pinches into stars, high puffs into blobs
  1.6,   // n2 and n3: low makes sharp petals, high square-ish sides
  0.9,   // how strongly n1, n2, n3 wander
  0.25,  // morph speed
  4,     // echo layers
  0.005, // line thickness
  0.08   // spin
)
  .color(0.55, 0.75, 1)
  .blend(src(o0).scale(0.985).rotate(0.01).color(1, 0.85, 0.6), 0.6)
  .out()
