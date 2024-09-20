import * as PIXI from 'pixi.js';

const dpr = window.devicePixelRatio || 1;

function computeFontSize(el) {
  return parseFloat(window.getComputedStyle(el).getPropertyValue('font-size'));
}

export function init(container) {
  const app = new PIXI.Application({
    width: container.clientWidth,
    height: container.clientHeight,
    backgroundAlpha: 0,
    antialias: true,
    resolution: dpr,
    autoDensity: true,
    autoStart: false, // Disable automatic rendering
  });
  app._fontSize = {
    root: computeFontSize(document.documentElement),
    container: computeFontSize(container),
  };
  app.view._app = app;
  return app.view;
}

export function clear(stage, comments) {
  const app = stage._app;
  app.stage.removeChildren();
  comments.forEach((cmt) => {
    cmt.sprite = null;
  });
}

export function resize(stage, width, height) {
  const app = stage._app;
  app.renderer.resize(width, height);
}

export function framing(stage) {
  const app = stage._app;
  app.render();
}

function parseFont(font, fontSize) {
  let fontSizeValue = 10;
  const regex = /(\d+(?:\.\d+)?)(px|%|em|rem)/;
  const match = font.match(regex);
  if (match) {
    fontSizeValue = parseFloat(match[1]);
    const unit = match[2];
    if (unit === '%') fontSizeValue *= fontSize.container / 100;
    if (unit === 'em') fontSizeValue *= fontSize.container;
    if (unit === 'rem') fontSizeValue *= fontSize.root;
  }
  return fontSizeValue;
}

function createCommentSprite(cmt, fontSize) {
  const defaultStyle = {
    font: '10px sans-serif',
    fillStyle: '#ffffff',
    textBaseline: 'bottom',
  };
  const style = { ...defaultStyle, ...cmt.style };
  const fontSizeValue = parseFont(style.font, fontSize);

  const textStyle = new PIXI.TextStyle({
    fontFamily: style.fontFamily || 'sans-serif',
    fontSize: fontSizeValue,
    fill: style.fillStyle || '#ffffff',
    align: style.align || 'left',
    stroke: style.strokeStyle || 0,
    strokeThickness: style.lineWidth || 0,
    lineJoin: 'round',
  });

  const text = new PIXI.Text(cmt.text, textStyle);

  // Set baseline adjustments
  let baselineOffset = 0;
  switch (style.textBaseline) {
    case 'top':
    case 'hanging':
      baselineOffset = 0;
      break;
    case 'middle':
      baselineOffset = text.height / 2;
      break;
    case 'bottom':
    default:
      baselineOffset = text.height;
      break;
  }
  text.y -= baselineOffset;

  // Set cmt.width and cmt.height
  cmt.width = text.width;
  cmt.height = text.height;

  return text;
}

export function setup(stage, comments) {
  const app = stage._app;
  comments.forEach((cmt) => {
    cmt.sprite = createCommentSprite(cmt, app._fontSize);
  });
}

export function render(stage, cmt) {
  const app = stage._app;
  cmt.sprite.x = cmt.x;
  cmt.sprite.y = cmt.y;
  app.stage.addChild(cmt.sprite);
}

export function remove(stage, cmt) {
  const app = stage._app;
  if (cmt.sprite) {
    app.stage.removeChild(cmt.sprite);
    cmt.sprite.destroy();
    cmt.sprite = null;
  }
}

export default {
  name: 'pixi',
  init,
  clear,
  resize,
  framing,
  setup,
  render,
  remove,
};
