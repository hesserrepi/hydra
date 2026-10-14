// Shaders made for this editor from reference pictures. Unlike the vendored
// collections these are our own: each lives in
// public/extensions/picture-shaders/lib-<name>.js (one file per picture) and is
// listed here so the autoloader and the extensions window know about it.
//
// Entry fields, besides the ones every extension has (see ./registry.js):
//   picture   - the reference picture, in public/extensions/picture-shaders/pictures/
//   model     - the extra-shaders functions the shader is built like, for readers
//
// Add a file with pictureShader('<name>', { ... }) below.

const DIR = 'picture-shaders'

export const pictureShader = (name, { thumbnail, picture, ...rest }) => ({
  id: `${DIR}/${name}`,
  collection: DIR,
  name,
  author: 'hesserrepi',
  file: `${DIR}/lib-${name}.js`,
  url: `extensions/${DIR}/lib-${name}.js`,
  documentation: picture ? `extensions/${DIR}/pictures/${picture}` : undefined,
  thumbnail: thumbnail ? `extensions/${DIR}/thumbnails/${thumbnail}` : undefined,
  autoload: true,
  ...rest
})

export const pictureShaders = [
]
