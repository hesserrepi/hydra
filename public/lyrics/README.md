Lyrics for `song` (see `../extensions/effects/hydra-song.js`).

Put a file named `<artist> - <title>.lrc` here, spelled as Spotify shows the
first artist and the title, and it is used instead of looking the song up on
lrclib.net. Characters that are not allowed in file names (`\ / : * ? " < > |`)
are written as `_`.

A line of an LRC file is `[minutes:seconds]text`, for example `[01:12.40]some words`.
Word timing (`[01:12.40]<01:12.40>some <01:12.90>words`) lights the words up
one by one when the style has a `highlight` colour.

`hydra - test song.lrc` belongs to the example `sketches/examples/song/2-song-by-hand.js`.
Lyrics of real songs are usually copyrighted: keep those files out of git.
