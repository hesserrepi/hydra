# Picture shaders

Hydra sources made from reference pictures, written in the style of the
`extra-shaders` patterns (`../extra-shaders/lib-pattern.js`,
`lib-softpattern.js`, `lib-noise.js`). Unlike the other folders here these files
are ours, so edit them freely.

## Layout

| path | what |
| --- | --- |
| `lib-<name>.js` | the shader(s) for one picture |
| `pictures/<name>.<ext>` | the reference picture |
| `thumbnails/<name>.png` | 60×60 preview for the extensions window (optional) |

Each file must also be listed in `src/extensions/picture-shaders.js` with the
function names it defines, so that using one in a sketch loads the file
automatically and it shows up under "picture shaders" in the extensions window.

## How a shader is written

Like the extra-shaders, each file only calls hydra's `setFunction`:

```js
setFunction({
  name: 'mypattern',     // unique across hydra, hyper-hydra and extra-shaders
  type: 'src',           // a source; use 'color' / 'coord' / 'combine' for filters
  inputs: [
    {name: 'scale', type: 'float', default: 4.0},
    {name: 'speed', type: 'float', default: 0.1},
  ],
  glsl: `
    vec2 st = (_st - 0.5) * scale;
    float d = ...;
    return vec4(vec3(d), 1.0);
  `
})
```

Techniques taken from the models:

- domain repetition and cell ids with `floor` / `fract` (`checker`, `hextile`, `brick`)
- polar coordinates with `atan` / `length` for radial structure (`spiral`, `lissa`)
- edges drawn with paired `smoothstep`s and a small epsilon, so lines stay crisp but anti-aliased
- layered octaves, halving amplitude and doubling frequency each pass (`wave`, `concentric`, `turb`)
- hydra's built-in `_noise(vec3)` and `_hsvToRgb` for organic variation and colour (`blinking`)
- `time` multiplied by a `speed` input so every pattern animates but can be frozen with `speed = 0`

A picture shader usually keeps the structure in grey (so it composes with
`.color()`, `.diff()`, `.modulate()`) and offers the picture's palette as an
optional second function, e.g. `mypattern()` and `mypatternColor()`.
