import domEngine from '../engine/dom.js';
import canvasEngine from '../engine/canvas.js';
import pixiEngine from '../engine/pixi.js';
import { bindEvents } from '../internal/events.js';
import play from '../internal/play.js';
import seek from '../internal/seek.js';
import { formatMode, resetSpace } from '../utils.js';

/* eslint-disable no-invalid-this */
export default function(opt) {
  this._ = {};
  this.container = opt.container || document.createElement('div');
  this.media = opt.media;
  this._.visible = true;

  /* eslint-disable no-undef */
  if (process.env.ENGINE) {
    const engineName = process.env.ENGINE.toLowerCase();
    this.engine = engineName;
    if (engineName === 'canvas') {
      this._.engine = canvasEngine;
    } else if (engineName === 'pixi') {
      this._.engine = pixiEngine;
    } else {
      this._.engine = domEngine;
    }
  } else {
    this.engine = (opt.engine || 'DOM').toLowerCase();
    if (this.engine === 'canvas') {
      this._.engine = canvasEngine;
    } else if (this.engine === 'pixi') {
      this._.engine = pixiEngine;
    } else {
      this._.engine = domEngine;
    }
  }
  /* eslint-enable no-undef */

  this._.requestID = 0;
  this._.speed = Math.max(0, opt.speed) || 144;
  this._.duration = 4;
  this.comments = opt.comments || [];
  this.comments.sort((a, b) => a.time - b.time);
  this.comments.forEach((cmt) => {
    cmt.mode = formatMode(cmt.mode);
  });
  this._.runningList = [];
  this._.position = 0;
  this._.paused = true;

  if (this.media) {
    this._.listener = {};
    bindEvents.call(this, this._.listener);
  }

  this._.stage = this._.engine.init(this.container);

  // Adjust the style based on whether the stage is a view or an element
  if (this._.stage.style) {
    this._.stage.style.cssText += 'position:relative;pointer-events:none;';
  } else if (this._.stage.view && this._.stage.view.style) {
    this._.stage.view.style.cssText += 'position:relative;pointer-events:none;';
  }

  this.resize();

  // Append the correct element to the container
  if (this._.stage.view) {
    this.container.appendChild(this._.stage.view);
  } else {
    this.container.appendChild(this._.stage);
  }

  this._.space = {};
  resetSpace(this._.space);

  if (!this.media || !this.media.paused) {
    seek.call(this);
    play.call(this);
  }
  return this;
}
