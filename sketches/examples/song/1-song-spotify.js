// Follow the song that plays in Spotify and show its lyrics.
// First time: song.connect('your Spotify client id'), then click "connect Spotify"
// (bottom right). Afterwards song.connect() is enough.
// Ctrl+Alt+Left / Right shift the timing by 0.1 s if the lyrics are early or late.
song.connect()
song.lyrics.init(s1, { size: 0.08, position: 'bottom', next: true })

// for every song without its own function
song.on('*', () => {
  osc(8, 0.05, 1.2)
    .modulate(noise(2, 0.1), () => 0.05 + song.progress * 0.3)
    .layer(src(s1))
    .out()
})

// for one song: part of 'artist - title', or its Spotify link
song.on('part of the title', (track) => {
  console.log('now playing', track.artist, '-', track.name)
  voronoi(6, 0.3).color(1, 0.4, 0.7).layer(src(s1)).out()
  // switch the picture at set times; joining late runs the last cue before now
  song.cue('0:45', () => noise(3, 0.2).kaleid(5).layer(src(s1)).out())
  song.cue('1:30', () => voronoi(6, 0.3).color(1, 0.4, 0.7).layer(src(s1)).out())
})
