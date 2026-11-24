// No Spotify needed: the bundled test "song" (lyrics in public/lyrics/) shows how
// the clock, the cues and the lyrics work. Run it, then try the lines at the end.
song.hud(true)
song.lyrics.init(s1, { size: 0.09, position: 'center', highlight: '#ffd54a', next: true })

song.on('hydra - test song', () => {
  osc(10, 0.05, 1).color(0.3, 0.5, 1).layer(src(s1)).out()
  song.cue(8, () => noise(3, 0.2).color(1, 0.4, 0.6).layer(src(s1)).out())
  song.cue(16, () => voronoi(8, 0.4).kaleid(4).layer(src(s1)).out())
  song.bpm(120)
})

// "the song started just now"
song.start('hydra - test song', 0)

// noticed late? say where the song is, one line at a time (Ctrl+Enter):
// song.start('hydra - test song', 9)   // it started 9 seconds ago
// song.sync(17)                        // it is at 17 s now
// song.nudge(-0.2)                     // lyrics came 0.2 s late: bring them earlier
