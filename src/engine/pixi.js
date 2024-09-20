import * as PIXI from 'pixi.js';

function computeFontSize(el) {
  return parseFloat(
    window.getComputedStyle(el).getPropertyValue('font-size')
  );
}

export function init(container) {
  const app = new PIXI.Application({
    resizeTo: container,
    backgroundAlpha: 0, // Transparent background
    antialias: true,
  });
  app._fontSize = {
    root: computeFontSize(document.documentElement),
    container: computeFontSize(container),
  };
  app.view._app = app; // Attach app to view for later reference
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

/* eslint-disable-next-line no-unused-vars */
export function framing(stage) {
  // No action needed; Pixi.js handles rendering
}

function createCommentSprite(cmt, fontSize) {
  const styleOptions = {
    fontSize: cmt.style?.fontSize || '10px',
    fontFamily: cmt.style?.fontFamily || 'Arial',
    fill: cmt.style?.fill || '#ffffff',
    align: cmt.style?.align || 'left',
  };

  const textStyle = new PIXI.TextStyle(styleOptions);
  const text = new PIXI.Text(cmt.text, textStyle);
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
