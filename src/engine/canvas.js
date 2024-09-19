import * as PIXI from 'pixi.js';

function computeFontSize(el) {
  return (
    window
      .getComputedStyle(el, null)
      .getPropertyValue('font-size')
      .match(/(.+)px/)[1] * 1
  );
}

export function init(container) {
  const app = new PIXI.Application({
    resizeTo: container,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  container.appendChild(app.view);
  app._fontSize = {
    root: computeFontSize(document.getElementsByTagName('html')[0]),
    container: computeFontSize(container),
  };
  return app;
}

export function clear(app, comments) {
  app.stage.removeChildren();
  // Avoid caching text objects to reduce memory usage
  for (let i = 0; i < comments.length; i++) {
    comments[i].pixiText = null;
  }
}

export function resize(app, width, height) {
  app.renderer.resize(width, height);
  app.view.style.width = width + 'px';
  app.view.style.height = height + 'px';
}

export function framing(app) {
  // No action needed, PixiJS handles rendering in the ticker
}

export function setup(app, comments) {
  for (let i = 0; i < comments.length; i++) {
    const cmt = comments[i];
    cmt.pixiText = createCommentText(cmt, app._fontSize);
  }
}

function createCommentText(cmt, fontSize) {
  const style = cmt.style || {};

  // Handle font size with units
  let fontSizeValue = style.fontSize || '10px';
  if (typeof fontSizeValue === 'string') {
    const sizeMatch = fontSizeValue.match(/(\d+(?:\.\d+)?)(px|%|em|rem)?/);
    let size = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2] || 'px';

    switch (unit) {
      case '%':
        size = (size / 100) * fontSize.container;
        break;
      case 'em':
        size *= fontSize.container;
        break;
      case 'rem':
        size *= fontSize.root;
        break;
      // 'px' and default case
      default:
        break;
    }
    fontSizeValue = size;
  }

  const textStyle = new PIXI.TextStyle({
    fontFamily: style.fontFamily || 'sans-serif',
    fontSize: fontSizeValue,
    fill: style.fill || '#000000',
    stroke: style.strokeStyle || '#000000',
    strokeThickness: style.lineWidth || 0,
    align: style.align || 'left',
  });

  const pixiText = new PIXI.Text(cmt.text, textStyle);
  cmt.width = cmt.width || pixiText.width;
  cmt.height = cmt.height || pixiText.height;

  // Set anchor based on textBaseline
  switch (style.textBaseline) {
    case 'top':
      pixiText.anchor.y = 0;
      break;
    case 'middle':
      pixiText.anchor.y = 0.5;
      break;
    case 'bottom':
    default:
      pixiText.anchor.y = 1;
      break;
  }

  return pixiText;
}

export function render(app, cmt) {
  cmt.pixiText.position.set(cmt.x, cmt.y);
  app.stage.addChild(cmt.pixiText);
}

export function remove(app, cmt) {
  if (cmt.pixiText && cmt.pixiText.parent) {
    cmt.pixiText.parent.removeChild(cmt.pixiText);
  }
  cmt.pixiText.destroy();
  cmt.pixiText = null;
}

export default {
  name: 'canvas',
  init: init,
  clear: clear,
  resize: resize,
  framing: framing,
  setup: setup,
  render: render,
  remove: remove,
};
