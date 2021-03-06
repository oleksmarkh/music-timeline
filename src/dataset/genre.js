import * as d3Color from 'd3-color';

import config from '../config';

export function insertGenres(scrobbleList, artistsByGenres) {
  const {genreGroups} = config;
  const genreGroupsByGenres = {};
  const genresByArtists = {};

  for (const genreGroup in genreGroups) {
    genreGroups[genreGroup].genres.forEach((genre) => genreGroupsByGenres[genre] = genreGroup);
  }

  for (const genre in artistsByGenres) {
    artistsByGenres[genre].forEach((artistName) => genresByArtists[artistName] = genre);
  }

  return scrobbleList.map((scrobble) => {
    const genre = genresByArtists[scrobble.artist.name];
    const genreGroup = genreGroupsByGenres[genre];

    return {
      ...scrobble,
      ...(genre && {
        artist: {
          ...scrobble.artist,
          genreGroup, // e.g. 'Rock'
          genre, // e.g. 'Classic Rock'
        },
      }),
    };
  });
}

export function getGenreSortedList(scrobbleList) {
  const {timeline: {point: {colorValueFactors}}, genreGroups} = config;
  const genres = {};
  const genreList = [];
  const artistPlaycounts = {};

  scrobbleList.forEach(({artist: {name, playcount, genreGroup, genre}}) => {
    if (!genre) {
      return;
    }

    let genreRecord = genres[genre];
    if (!genreRecord) {
      genreRecord = {
        genreGroup,
        artistCount: 0,
        playcount: 0,
      };
      genres[genre] = genreRecord;
    }

    if (artistPlaycounts[name]) {
      genreRecord.playcount = genreRecord.playcount - artistPlaycounts[name] + playcount;
    } else {
      genreRecord.artistCount += 1;
      genreRecord.playcount += playcount;
    }

    artistPlaycounts[name] = playcount;
  });

  for (const genre in genres) {
    const {artistCount, playcount, genreGroup} = genres[genre];
    const genreGroupConfig = genreGroups[genreGroup];

    if (!genreGroupConfig) {
      console.warn(`genre not found in the config: ${genre}`);
      continue;
    }

    const {colorRange: [baseColor]} = genreGroupConfig;
    const color = d3Color.hsl(baseColor);
    const highlightedColor = d3Color.hsl(baseColor);

    color.s *= colorValueFactors.other.saturation;
    color.l *= colorValueFactors.other.lightness;

    highlightedColor.s *= colorValueFactors.genre.saturation;
    highlightedColor.l *= colorValueFactors.genre.lightness;

    [
      color,
      highlightedColor,
    ].forEach((c) => {
      if (c.s > 1) { c.s = 1; }
      if (c.l > 1) { c.l = 1; }
    });

    genreList.push({
      name: genre,
      group: genreGroup,
      artistCount,
      playcount,
      color,
      highlightedColor,
    });
  }

  return genreList.sort((a, b) => b.playcount - a.playcount);
}
