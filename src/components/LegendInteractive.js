import {createProxyMethod} from '../utils/decorator';

export default class LegendInteractive {
  constructor(props, legend) {
    this.props = props;
    this.legend = legend;
    this.highlightedGenreIndex = null;
    this.eventListeners = {};

    createProxyMethod(this, this.legend)('render');
  }

  subscribe() {
    const {onGenreMouseEnter} = this.props;
    const {genreElementCollection, genreList} = this.legend;

    for (let i = 0; i < genreElementCollection.length; i += 1) {
      const genreElement = genreElementCollection[i];
      const {name} = genreList[i];
      const onMouseEnter = () => onGenreMouseEnter(name);

      this.eventListeners[name] = onMouseEnter;
      genreElement.addEventListener('mouseenter', onMouseEnter);
    }
  }

  unsubscribe() {
    const {genreElementCollection, genreList} = this.legend;

    for (let i = 0; i < genreElementCollection.length; i += 1) {
      const genreElement = genreElementCollection[i];
      const {name} = genreList[i];

      genreElement.removeEventListener('mouseenter', this.eventListeners[name]);
    }
  }

  highlightGenre(genre) {
    const {genreElementCollection, genreList} = this.legend;
    const genreIndex = genreList.findIndex(({name}) => name === genre);
    const genreElement = genreElementCollection[genreIndex];
    const {highlightedColor} = genreList[genreIndex];

    genreElement.classList.add('Legend__genre--highlighted');
    genreElement.style.backgroundColor = highlightedColor;

    this.highlightedGenreIndex = genreIndex;
  }

  removeGenreHighlight() {
    if (this.highlightedGenreIndex !== null) {
      const {genreElementCollection, genreList} = this.legend;
      const genreElement = genreElementCollection[this.highlightedGenreIndex];
      const {color} = genreList[this.highlightedGenreIndex];

      genreElement.classList.remove('Legend__genre--highlighted');
      genreElement.style.backgroundColor = color;

      this.highlightedGenreIndex = null;
    }
  }

  afterRender() {
    this.legend.afterRender();
    this.subscribe();
  }
}
