# music-stats timeline

  [![license][license-image]][license-url]
  ![code size][code-size-image]

Visualization of last.fm stats.

The idea is to collect all scrobbles for a given timeframe, slice by days (or weeks, months) into chunks,
optionally group by artists and sort by tags (genres) inside each chunk.
Then, map to pixels (colored according to tags) and place on a timeline, forming some kind of summary bar chart.

Without grouping, that might form an exact log of all scrobbles. Speaking of which,
not only a bar chart is potentially interesting - another form is "playtime timeline within daily timeline",
showing exact minutes with music on, for each day. Basically, stripping silent time out leads to a bar chart :)
And keeping it there means exact visualization of listening habits.

"Pixel" is a metaphoric term here, in fact there could be boxes of different height,
depending on corresponding track duration. Those boxes could have some interaction,
e.g. on hover reveals a tiny popup with metadata. Could also be a fixed info box, if a popup turns to be annoying.

Another interactivity example - highlighting all scrobbles that relate to a hovered one (same track, album, artist or tag).
The UI could also contain a list of tags below the timeline (genres, countries) - clicking a tag
will lead to highlighting all scrobbles that belong to that tag.
Tags should be sorted (descending order) according to number of related scrobbles.

With genres and scrobbles it can become a bit more complicated than a simple "one-to-many" relation,
because sub-genres are somewhat nested, i.e. expressed as a tree:

```
                  metal
                  |  |
         folk metal  ...
            |  |  |
medieval metal |  |
     viking metal |
        slavonic heathen metal
```

It can become even more convoluted if some exotic intersections appear, like "jazz-punk" or whatever :)

All that should aim to showcase the ratio between different aspects of how musical taste evolves (or prove that it doesn't).

```
// x-progression                   // y-progression

scrobbles
⌃                                  +----------> scrobbles
|··········                        |●●········
|······●●··/------------⌝          |○○●·/------------⌝
|··●●·●●○●<  ♭ metadata |          |○●●<  ♭ metadata |
|·●○●●○○○●·\------------⌟          |●●··\------------⌟
|·●○○●○○○○·                        |○○●·······
+----------> t (days)              ⌄
                                   t (days)
```

## Tech stack

dev deps:
[`elm`](https://guide.elm-lang.org).

deps: TBD.

## APIs, datasets

last.fm:
- [ ] [`user.getTopArtists`](https://www.last.fm/api/show/user.getTopArtists) (pagination is fine)
- [ ] [`user.getArtistTracks`](https://www.last.fm/api/show/user.getArtistTracks) (pagination seems to be weird, always giving `"totalPages": "0"`)
- [ ] [`artist.getInfo`](https://www.last.fm/api/show/artist.getInfo) and [`track.getInfo`](https://www.last.fm/api/show/track.getInfo) (there are also `artist.getTags` and `track.getTags` endpoints but those simply return lists of tag names and URLs, while `.getInfo` also supplies tags plus additional data, e.g. track duration)

## Setup

### Environment variables

Create a `.env` file and fill its values according to [`.env.template`](.env.template):

* `LASTFM_API_KEY` (see last.fm [docs](https://www.last.fm/api/authentication))

### Commands

```bash
$ # TBD
```

## Scripts

TBD.

[license-image]: https://img.shields.io/github/license/music-stats/timeline.svg?style=flat-square
[license-url]: https://github.com/music-stats/timeline/blob/master/LICENSE
[code-size-image]: https://img.shields.io/github/languages/code-size/music-stats/timeline.svg?style=flat-square
