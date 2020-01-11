import * as d3Scale from 'd3-scale';

import config from '../config';
import {clamp} from '../utils/number';
import PointCollection from '../stores/PointCollection';

export default class TimelineInteractive {
  constructor(props, timeline) {
    this.props = props;
    this.timeline = timeline;

    this.selectedScrobble = null;
    this.scrobbleCollectionHighlighted = new PointCollection();

    this.timeRange = [
      this.timeline.scrobbleCollection.getFirst().timestamp,
      this.timeline.scrobbleCollection.getLast().timestamp,
    ];

    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
    this.handlePlotMouseMove = this.handlePlotMouseMove.bind(this);
    this.handlePlotWheel = this.handlePlotWheel.bind(this);
    this.handleLegendGenreClick = this.handleLegendGenreClick.bind(this);

    Object.assign(
      this.timeline.props,
      {
        onPlotMouseMove: this.handlePlotMouseMove,
        onPlotWheel: this.handlePlotWheel,
        onLegendGenreClick: this.handleLegendGenreClick,
      },
    );
  }

  subscribe() {
    window.addEventListener('resize', this.handleWindowResize);
    document.addEventListener('keydown', this.handleDocumentKeydown);
  }

  resetState() {
    const {scrobbleBuffer, scrobbleGenreRegistry, scrobbleArtistRegistry} = this.timeline;

    scrobbleBuffer.reset();
    scrobbleGenreRegistry.reset();
    scrobbleArtistRegistry.reset();

    this.scrobbleCollectionHighlighted.reset();
    this.selectedScrobble = null;
  }

  resetUi() {
    const {infoBox, selectedScrobbleTimeLabel, legend, artistLabelCollection} = this.timeline.children;

    infoBox.showIntroMessage();
    selectedScrobbleTimeLabel.clear();
    legend.removeGenreHighlight();
    artistLabelCollection.removeAllLabels();
  }

  highlightGenreScrobbleList(genre, genreGroup, artistNameToSkip = null, toRenderArtistLabelCollection = true) {
    const {scrobbleGenreRegistry} = this.timeline;
    const {plot, artistLabelCollection} = this.timeline.children;
    const genreScrobbleList = scrobbleGenreRegistry.getPointList(genre);

    // there could be no scrobbles for a given genre,
    // since registry is repopulated when zoomed time range changes
    if (!genreScrobbleList) {
      return;
    }

    const [plotWidth] = plot.getDimensions();
    const artistLastPoints = {};

    genreScrobbleList.forEach(({
      artist: {name: artistName},
      album: {playcount},
      x,
      y,
    }) => {
      if (artistName !== artistNameToSkip) {
        const color = this.timeline.getGenreGroupColorByAlbumPlaycount(genreGroup, playcount, true, false);

        this.scrobbleCollectionHighlighted.push({x, y});
        artistLastPoints[artistName] = {x, y, color};
        plot.drawPoint(x, y, color);
      }
    });

    if (toRenderArtistLabelCollection) {
      for (const artistName in artistLastPoints) {
        const {x, y, color} = artistLastPoints[artistName];
        artistLabelCollection.renderLabel(x, y, plotWidth, artistName, color, false);
      }
    }
  }

  highlightArtistScrobbleList({index, artist, track}, toRenderArtistLabelCollection = true) {
    const {timeline: {point: {selectedColor: selectedTrackColor}}} = config;
    const {scrobbleArtistRegistry} = this.timeline;
    const {plot, selectedScrobbleTimeLabel, artistLabelCollection} = this.timeline.children;
    const [plotWidth] = plot.getDimensions();
    const sameTrackPointList = [];
    let lastPoint = null;

    scrobbleArtistRegistry.getPointList(artist.name).forEach(({
      index: scrobbleGlobalIndex,
      date,
      album: {playcount},
      track: {name},
      x,
      y,
    }) => {
      const color = this.timeline.getGenreGroupColorByAlbumPlaycount(artist.genreGroup, playcount, false, true);

      this.scrobbleCollectionHighlighted.push({x, y});
      lastPoint = {x, y, color};

      // skipping same track scrobbles, those will be rendered after the main loop (to appear on top)
      if (name === track.name) {
        sameTrackPointList.push({x, y});
      } else {
        plot.drawPoint(x, y, color);
      }

      if (scrobbleGlobalIndex === index) {
        selectedScrobbleTimeLabel.renderText(x, plotWidth, date);
      }
    });

    sameTrackPointList.forEach(({x, y}) => plot.drawPoint(x, y, selectedTrackColor));

    if (toRenderArtistLabelCollection) {
      artistLabelCollection.renderLabel(lastPoint.x, lastPoint.y, plotWidth, artist.name, lastPoint.color, true);
    }
  }

  removeScrobbleCollectionHighlight() {
    const {scrobbleBuffer} = this.timeline;
    const {plot} = this.timeline.children;

    this.scrobbleCollectionHighlighted.getAll().forEach(
      ({x, y}) => plot.drawPoint(x, y, scrobbleBuffer.getPoint(x, y).color),
    );
    this.scrobbleCollectionHighlighted.reset();
  }

  selectGenre(genre, genreGroup) {
    const {legend} = this.timeline.children;

    // clean old
    this.selectedScrobble = null;
    this.removeScrobbleCollectionHighlight();
    this.resetUi();

    // show new
    this.highlightGenreScrobbleList(genre, genreGroup);
    legend.highlightGenre(genre);
  }

  selectScrobble(scrobble) {
    const {summaryRegistry} = this.timeline;
    const {infoBox, legend, artistLabelCollection} = this.timeline.children;
    const {artist} = scrobble;
    const isNewArtist = !(this.selectedScrobble && this.selectedScrobble.artist.name === artist.name);

    // clean old
    this.selectedScrobble = scrobble;
    this.removeScrobbleCollectionHighlight();
    infoBox.hideIntroMessage();

    // there's no need to re-render genre-related labels if selected artist didn't change
    if (isNewArtist) {
      legend.removeGenreHighlight();
      artistLabelCollection.removeAllLabels();
    }

    // show new
    if (artist.genre) {
      this.highlightGenreScrobbleList(artist.genre, artist.genreGroup, artist.name, isNewArtist);

      if (isNewArtist) {
        legend.highlightGenre(artist.genre);
      }
    }

    // artist scrobbles are rendered on top of genre scrobbles and artist labels
    this.highlightArtistScrobbleList(scrobble, isNewArtist);

    infoBox.renderScrobbleInfo({
      scrobble,
      totals: summaryRegistry.getTotals(scrobble),
    });
  }

  selectVerticallyAdjacentScrobble(scrobble, shift) {
    const {scrobbleCollectionZoomed} = this.timeline;

    if (scrobble) {
      const adjacentScrobble = scrobbleCollectionZoomed.getAdjacent(scrobble, shift);

      if (adjacentScrobble) {
        this.selectScrobble(adjacentScrobble);
      }
    }
  }

  selectHorizontallyAdjacentScrobble(scrobble, shift) {
    const {scrobbleCollectionZoomed} = this.timeline;

    if (scrobble) {
      const filter = ({artist: {playcount}}) => playcount === scrobble.artist.playcount;
      const adjacentScrobble = scrobbleCollectionZoomed.getAdjacent(scrobble, shift, filter);

      if (adjacentScrobble) {
        this.selectScrobble(adjacentScrobble);
      }
    }
  }

  handleWindowResize() {
    // A timeout handle is used for throttling and dealing with mobile device rotation.
    // On some mobile browsers, the "resize" event is triggered before window dimensions are changed.
    clearTimeout(this.windowResizeTimeoutHandle);

    this.windowResizeTimeoutHandle = setTimeout(
      () => {
        this.resetState();
        this.draw();
        this.resetUi();
      },
      100,
    );
  }

  handleDocumentKeydown(event) {
    switch (event.key) {
      case 'Escape': return this.handleEscKeydown();
      case 'ArrowDown': return this.handleArrowDownKeydown();
      case 'ArrowUp': return this.handleArrowUpKeydown();
      case 'ArrowLeft': return this.handleArrowLeftKeydown();
      case 'ArrowRight': return this.handleArrowRightKeydown();
    }
  }

  handleEscKeydown() {
    this.selectedScrobble = null;
    this.removeScrobbleCollectionHighlight();
    this.resetUi();
  }

  handleArrowDownKeydown() {
    this.selectVerticallyAdjacentScrobble(this.selectedScrobble, -1);
  }

  handleArrowUpKeydown() {
    this.selectVerticallyAdjacentScrobble(this.selectedScrobble, 1);
  }

  handleArrowLeftKeydown() {
    this.selectHorizontallyAdjacentScrobble(this.selectedScrobble, -1);
  }

  handleArrowRightKeydown() {
    this.selectHorizontallyAdjacentScrobble(this.selectedScrobble, 1);
  }

  handlePlotMouseMove(event) {
    const {scrobbleBuffer} = this.timeline;
    const {offsetX: x, offsetY: y} = event;
    const scrobble = scrobbleBuffer.getPoint(x, y);

    if (scrobble) {
      this.selectScrobble(scrobble);
    }
  }

  handlePlotWheel(event) {
    event.preventDefault();

    const {timeline: {zoomDeltaFactor, minTimeRange, plot: {padding: plotPadding}}} = config;
    const {scrobbleList} = this.props;
    const {scrobbleCollection, timeRangeZoomed} = this.timeline;
    const {plot} = this.timeline.children;
    const {offsetX, deltaY} = event;

    const [plotWidth] = plot.getDimensions();
    const plotWidthPadded = plotWidth - 2 * plotPadding;

    const timeScale = d3Scale.scaleLinear()
      .domain([0, plotWidthPadded])
      .rangeRound(timeRangeZoomed);

    const xTimestamp = timeScale(clamp(offsetX - plotPadding, ...timeScale.domain()));
    const zoomFactor = 1 - deltaY * zoomDeltaFactor;
    const leftTimeRange = (xTimestamp - timeRangeZoomed[0]) / zoomFactor;
    const rightTimeRange = (timeRangeZoomed[1] - xTimestamp) / zoomFactor;

    if (leftTimeRange + rightTimeRange < minTimeRange) {
      return;
    }

    this.timeline.timeRangeZoomed = [
      Math.max(xTimestamp - leftTimeRange, this.timeRange[0]),
      Math.min(xTimestamp + rightTimeRange, this.timeRange[1]),
    ];

    this.timeline.scrobbleCollectionZoomed = new PointCollection(scrobbleList.slice(
      scrobbleCollection.getPrevious(this.timeline.timeRangeZoomed[0]).index,
      scrobbleCollection.getNext(this.timeline.timeRangeZoomed[1]).index + 1,
    ));

    this.resetState();
    this.draw(false);
    this.resetUi();
  }

  handleLegendGenreClick(genre, genreGroup) {
    this.selectGenre(genre, genreGroup);
  }

  draw(toRescalePlot = true) {
    this.timeline.draw(toRescalePlot);
  }

  beforeRender() {
    this.timeline.beforeRender();
  }

  afterRender() {
    this.timeline.afterRender();
    this.subscribe();
  }

  render() {
    return this.timeline.render();
  }
}
