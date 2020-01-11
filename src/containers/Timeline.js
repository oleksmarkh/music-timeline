import * as d3Scale from 'd3-scale';
import * as d3ScaleChromatic from 'd3-scale-chromatic';
import * as d3Color from 'd3-color';
import html from '../lib/html';

import config from '../config';

import PointCollection from '../stores/PointCollection';
import PointBuffer from '../stores/PointBuffer';
import PointRegistry from '../stores/PointRegistry';
import SummaryRegistry from '../stores/SummaryRegistry';

import Plot from '../components/Plot';
import PlotInteractive from '../components/PlotInteractive';
import TimeAxisLabel from '../components/TimeAxisLabel';
import InfoBox from '../components/InfoBox';
import ExternalLinks from '../components/ExternalLinks';
import Legend from '../components/Legend';
import LegendInteractive from '../components/LegendInteractive';
import ArtistLabelCollection from '../components/ArtistLabelCollection';

export default class Timeline {
  constructor(props) {
    const {timeline: {point: {size: scrobbleSize}}} = config;
    const {scrobbleList} = props;

    this.props = props;
    this.children = {};

    this.scrobbleHalfSize = Math.ceil(scrobbleSize / 2);

    this.scrobbleCollection = new PointCollection(scrobbleList);
    this.scrobbleCollectionZoomed = new PointCollection(scrobbleList);
    this.scrobbleBuffer = new PointBuffer(this.scrobbleHalfSize);
    this.scrobbleGenreRegistry = new PointRegistry(({artist: {genre}}) => genre);
    this.scrobbleArtistRegistry = new PointRegistry(({artist: {name}}) => name);
    this.summaryRegistry = new SummaryRegistry(scrobbleList);

    this.scales = {};
    this.genreGroupColorScales = this.getGenreGroupColorScales();

    this.timeRangeZoomed = [
      this.scrobbleCollectionZoomed.getFirst().timestamp,
      this.scrobbleCollectionZoomed.getLast().timestamp,
    ];
  }

  initializeChildrenComponents() {
    const {scrobbleList, onPlotMouseMove, onPlotWheel, onLegendGenreClick} = this.props;

    this.children.plot = new PlotInteractive(
      {
        onMouseMove: onPlotMouseMove,
        onWheel: onPlotWheel,
      },
      new Plot({
        pointHalfSize: this.scrobbleHalfSize,
      }),
    );

    this.children.infoBox = new InfoBox({
      dates: {
        firstScrobbleDate: this.scrobbleCollection.getFirst().date,
        lastScrobbleDate: this.scrobbleCollection.getLast().date,
      },
      counts: {
        ...this.summaryRegistry.getSummary(),
        scrobbleCount: scrobbleList.length,
        perDayCount: this.getPerDayCount(),
      },
    });

    this.children.externalLinks = new ExternalLinks();

    this.children.firstScrobbleTimeLabel = new TimeAxisLabel({
      id: 'first-scrobble-time-label',
    });
    this.children.lastScrobbleTimeLabel = new TimeAxisLabel({
      id: 'last-scrobble-time-label',
    });
    this.children.selectedScrobbleTimeLabel = new TimeAxisLabel({
      id: 'selected-scrobble-time-label',
      isMostTop: true,
    });

    this.children.legend = new LegendInteractive(
      {
        onGenreClick: onLegendGenreClick,
      },
      new Legend({
        scrobbleList,
      }),
    );

    this.children.artistLabelCollection = new ArtistLabelCollection();
  }

  initializeScales() {
    const {
      timeline: {
        plot: {padding: plotPadding},
        point: {size: scrobbleSize, maxMargin: scrobbleMaxMargin},
        timeAxis: {width: timeAxisWidth},
        scales: {albumPlaycount: {range: albumPlaycountScaleRange}},
      },
    } = config;

    const {plot} = this.children;
    const [width, height] = plot.getDimensions();
    const [maxArtistPlaycount, maxAlbumPlaycount] = this.summaryRegistry.getMaxPlaycounts();

    // plot height calculation is ensuring equal vertical gaps between points
    const plotBottom = height - plotPadding - timeAxisWidth / 2 - scrobbleSize;
    const plotMaxHeight = plotBottom - plotPadding;
    let scrobbleMargin = scrobbleMaxMargin;
    let plotHeight = plotMaxHeight;
    while (scrobbleMargin >= 0) {
      const plotHeightNext = (maxArtistPlaycount - 1) * (scrobbleSize + scrobbleMargin);

      if (plotHeightNext > plotMaxHeight) {
        scrobbleMargin -= 1;
      } else {
        plotHeight = plotHeightNext;
        break;
      }
    }
    const plotTop = plotBottom - plotHeight;

    // X axis
    this.scales.timeRangeScale = d3Scale.scaleLinear()
      .domain(this.timeRangeZoomed)
      .rangeRound([plotPadding, width - plotPadding]);

    // Y axis
    this.scales.artistPlaycountScale = d3Scale.scaleLinear()
      .domain([1, maxArtistPlaycount])
      .rangeRound([plotBottom, plotTop]);

    // scrobble point color
    this.scales.albumPlaycountScale = d3Scale.scaleLinear()
      .domain([1, maxAlbumPlaycount])
      .range(albumPlaycountScaleRange);
  }

  getPerDayCount() {
    const {scrobbleList} = this.props;
    const firstScrobbleTimestamp = this.scrobbleCollection.getFirst().timestamp;
    const lastScrobbleTimestamp = this.scrobbleCollection.getLast().timestamp;
    const msInDay = 24 * 60 * 60 * 1000;
    const dayCount = Math.ceil((lastScrobbleTimestamp - firstScrobbleTimestamp) / msInDay);
    const perDayCount = Math.round(10 * scrobbleList.length / dayCount) / 10;

    return perDayCount;
  }

  getGenreGroupColorScales() {
    const {genreGroups} = config;
    const scales = {};
    const maxAlbumPlaycount = this.summaryRegistry.getMaxPlaycounts()[1];

    for (const genreGroup in genreGroups) {
      scales[genreGroup] = d3Scale.scaleSequential()
        .domain([1, maxAlbumPlaycount])
        .range(genreGroups[genreGroup].colorRange);
    }

    return scales;
  }

  getGenreGroupColorByAlbumPlaycount(genreGroup, playcount, toHighlightGenre = false, toHighlightArtist = false) {
    const {timeline: {point: {colorValueFactors}}} = config;
    const genreGroupColorScale = this.genreGroupColorScales[genreGroup];
    const color = d3Color.hsl(
      genreGroupColorScale
        ? genreGroupColorScale(playcount)
        : d3ScaleChromatic.interpolateGreys(this.scales.albumPlaycountScale(playcount)),
    );

    if (toHighlightGenre) {
      color.s *= colorValueFactors.genre.saturation;
      color.l *= colorValueFactors.genre.lightness;
      return color;
    }

    if (toHighlightArtist) {
      color.s *= colorValueFactors.artist.saturation;
      color.l *= colorValueFactors.artist.lightness;
      return color;
    }

    color.s *= colorValueFactors.other.saturation;
    color.l *= colorValueFactors.other.lightness;
    return color;
  }

  draw(toRescalePlot = true) {
    const {plot, firstScrobbleTimeLabel, lastScrobbleTimeLabel} = this.children;

    // subsequent calls depend on plot dimensions
    if (toRescalePlot) {
      plot.scale();
    }

    this.initializeScales();
    plot.drawBackground();

    this.scrobbleCollectionZoomed.getAll().forEach((scrobble) => {
      const {timestamp, artist, album} = scrobble;
      const x = this.scales.timeRangeScale(timestamp);
      const y = this.scales.artistPlaycountScale(artist.playcount);
      const color = this.getGenreGroupColorByAlbumPlaycount(artist.genreGroup, album.playcount);
      const point = {
        ...scrobble,
        x,
        y,
        color,
      };

      plot.drawPoint(x, y, color);
      this.scrobbleBuffer.putPoint(point);
      this.scrobbleGenreRegistry.putPoint(point);
      this.scrobbleArtistRegistry.putPoint(point);
    });

    plot.drawTimeAxis(...this.scales.timeRangeScale.range());

    const [plotWidth] = plot.getDimensions();
    const firstScrobble = this.scrobbleCollectionZoomed.getFirst();
    const lastScrobble = this.scrobbleCollectionZoomed.getLast();
    firstScrobbleTimeLabel.renderText(this.scales.timeRangeScale(firstScrobble.timestamp), plotWidth, firstScrobble.date);
    lastScrobbleTimeLabel.renderText(this.scales.timeRangeScale(lastScrobble.timestamp), plotWidth, lastScrobble.date);
  }

  // things needed for the first render
  beforeRender() {
    this.initializeChildrenComponents();
  }

  // things to initialize after the first render
  afterRender() {
    Object.values(this.children).forEach((child) => {
      if (typeof child.afterRender === 'function') {
        child.afterRender();
      }
    });
  }

  render() {
    return html`
      <main>
        ${Object.values(this.children).map((child) => child.render())}
      </main>
    `;
  }
}
