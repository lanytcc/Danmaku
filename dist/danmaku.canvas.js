(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Danmaku = factory());
})(this, (function () { 'use strict';

  ((function() {
    /* istanbul ignore next */
    if (typeof document === 'undefined') return 'transform';
    var properties = [
      'oTransform', // Opera 11.5
      'msTransform', // IE 9
      'mozTransform',
      'webkitTransform',
      'transform'
    ];
    var style = document.createElement('div').style;
    for (var i = 0; i < properties.length; i++) {
      /* istanbul ignore else */
      if (properties[i] in style) {
        return properties[i];
      }
    }
    /* istanbul ignore next */
    return 'transform';
  })());

  var dpr = typeof window !== 'undefined' && window.devicePixelRatio || 1;

  var canvasHeightCache = Object.create(null);

  function canvasHeight(font, fontSize) {
    if (canvasHeightCache[font]) {
      return canvasHeightCache[font];
    }
    var height = 12;
    var regex = /(\d+(?:\.\d+)?)(px|%|em|rem)(?:\s*\/\s*(\d+(?:\.\d+)?)(px|%|em|rem)?)?/;
    var p = font.match(regex);
    if (p) {
      var fs = p[1] * 1 || 10;
      var fsu = p[2];
      var lh = p[3] * 1 || 1.2;
      var lhu = p[4];
      if (fsu === '%') fs *= fontSize.container / 100;
      if (fsu === 'em') fs *= fontSize.container;
      if (fsu === 'rem') fs *= fontSize.root;
      if (lhu === 'px') height = lh;
      if (lhu === '%') height = fs * lh / 100;
      if (lhu === 'em') height = fs * lh;
      if (lhu === 'rem') height = fontSize.root * lh;
      if (lhu === undefined) height = fs * lh;
    }
    canvasHeightCache[font] = height;
    return height;
  }

  function createCommentCanvas(cmt, fontSize) {
    if (typeof cmt.render === 'function') {
      var cvs = cmt.render();
      if (cvs instanceof HTMLCanvasElement) {
        cmt.width = cvs.width;
        cmt.height = cvs.height;
        return cvs;
      }
    }
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var style = cmt.style || {};
    style.font = style.font || '10px sans-serif';
    style.textBaseline = style.textBaseline || 'bottom';
    var strokeWidth = style.lineWidth * 1;
    strokeWidth = (strokeWidth > 0 && strokeWidth !== Infinity)
      ? Math.ceil(strokeWidth)
      : !!style.strokeStyle * 1;
    ctx.font = style.font;
    cmt.width = cmt.width ||
      Math.max(1, Math.ceil(ctx.measureText(cmt.text).width) + strokeWidth * 2);
    cmt.height = cmt.height ||
      Math.ceil(canvasHeight(style.font, fontSize)) + strokeWidth * 2;
    canvas.width = cmt.width * dpr;
    canvas.height = cmt.height * dpr;
    ctx.scale(dpr, dpr);
    for (var key in style) {
      ctx[key] = style[key];
    }
    var baseline = 0;
    switch (style.textBaseline) {
      case 'top':
      case 'hanging':
        baseline = strokeWidth;
        break;
      case 'middle':
        baseline = cmt.height >> 1;
        break;
      default:
        baseline = cmt.height - strokeWidth;
    }
    if (style.strokeStyle) {
      ctx.strokeText(cmt.text, strokeWidth, baseline);
    }
    ctx.fillText(cmt.text, strokeWidth, baseline);
    return canvas;
  }

  function computeFontSize(el) {
    return window
      .getComputedStyle(el, null)
      .getPropertyValue('font-size')
      .match(/(.+)px/)[1] * 1;
  }

  function init$1(container) {
    var stage = document.createElement('canvas');
    stage.context = stage.getContext('2d');
    stage._fontSize = {
      root: computeFontSize(document.getElementsByTagName('html')[0]),
      container: computeFontSize(container)
    };
    return stage;
  }

  function clear$1(stage, comments) {
    stage.context.clearRect(0, 0, stage.width, stage.height);
    // avoid caching canvas to reduce memory usage
    for (var i = 0; i < comments.length; i++) {
      comments[i].canvas = null;
    }
  }

  function resize$1(stage, width, height) {
    stage.width = width * dpr;
    stage.height = height * dpr;
    stage.style.width = width + 'px';
    stage.style.height = height + 'px';
  }

  function framing(stage) {
    stage.context.clearRect(0, 0, stage.width, stage.height);
  }

  function setup(stage, comments) {
    for (var i = 0; i < comments.length; i++) {
      var cmt = comments[i];
      cmt.canvas = createCommentCanvas(cmt, stage._fontSize);
    }
  }

  function render(stage, cmt) {
    stage.context.drawImage(cmt.canvas, cmt.x * dpr, cmt.y * dpr);
  }

  function remove(stage, cmt) {
    // avoid caching canvas to reduce memory usage
    cmt.canvas = null;
  }

  var canvasEngine = {
    name: 'canvas',
    init: init$1,
    clear: clear$1,
    resize: resize$1,
    framing: framing,
    setup: setup,
    render: render,
    remove: remove,
  };

  /* eslint no-invalid-this: 0 */
  function allocate(cmt) {
    const that = this;
    const ct = that.media ? that.media.currentTime : Date.now() / 1000;
    const pbr = that.media ? that.media.playbackRate : 1;
    const mode = cmt.mode;

    // Calculate the number of tracks
    const trackHeight = cmt.height;
    const totalHeight = that._.height;
    const numberOfTracks = Math.floor(totalHeight / trackHeight);

    // Initialize space, if necessary
    if (!that._.space[mode] || that._.space[mode].length !== numberOfTracks) {
      that._.space[mode] =
        new Array(numberOfTracks).fill(null).map(() => ({ endTime: 0 }));
    }

    const tracks = that._.space[mode];
    let trackIndex = -1;

    // Check if a comment can be placed on a track
    function canPlaceCommentOnTrack(track, cmt, ct, pbr, mode, _that) {
      if (!track || !track.endTime) {
        return true;
      }

      // Check if the previous comment has exited the screen
      if (ct >= track.endTime) {
        return true;
      }
      // For scrolling comments, check for collision based on positions
      if (mode === 'ltr' || mode === 'rtl') {
        // Since all comments move at the same speed, we need to ensure that
        // the new comment will not overlap with the existing one on this track.
        const elapsedTimeSinceTrackStart = ct - track.startTime;
        const elapsedTimeSinceCmtStart = ct - cmt.time;
        const totalDuration = _that._.duration / pbr;
        const screenWidth = _that._.width;
        // Calculate positions
        const trackCommentDistance = (elapsedTimeSinceTrackStart / totalDuration) * screenWidth;
        const newCommentDistance = (elapsedTimeSinceCmtStart / totalDuration) * screenWidth;

        let trackCommentStart = 0;
        let trackCommentEnd = 0;
        let newCommentStart = 0;
        let newCommentEnd = 0;

        if (mode === 'rtl') {
          // For 'rtl', comments move from right to left
          trackCommentStart = _that._.width - trackCommentDistance;
          trackCommentEnd = trackCommentStart + track.width;

          newCommentStart = _that._.width - newCommentDistance;
          newCommentEnd = newCommentStart + cmt.width;
        } else {
          // For 'ltr', comments move from left to right
          trackCommentEnd = -track.width + trackCommentDistance;
          trackCommentStart = trackCommentEnd - track.width;

          newCommentEnd = -cmt.width + newCommentDistance;
          newCommentStart = newCommentEnd - cmt.width;
        }

        // Check if the bounding boxes of the two comments overlap
        if (
          (newCommentStart < trackCommentEnd && newCommentEnd > trackCommentStart) ||
          (newCommentEnd > trackCommentStart && newCommentStart < trackCommentEnd)
        ) {
          return false;
        }
      }

      // For 'top' and 'bottom' modes, ensure that the display time has elapsed
      if (mode === 'top' || mode === 'bottom') {
        const duration = _that._.duration / pbr;
        if (ct - track.startTime >= duration) {
          return true;
        }
        return false;
      }
      return true;
    }

    // Traverse tracks to find an available track
    for (let i = 0; i < numberOfTracks; i++) {
      const track = tracks[i];
      if (canPlaceCommentOnTrack(track, cmt, ct, pbr, mode, that)) {
        trackIndex = i;
        break;
      }
    }

    // If no track is available, return -1
    if (trackIndex === -1) {
      return -1;
    }

    // Update track information
    const startTime = that.media ? cmt.time : cmt._utc;
    const endTime = startTime + (that._.duration / pbr);

    tracks[trackIndex] = {
      startTime: startTime,
      endTime: endTime,
      width: cmt.width,
      height: cmt.height,
    };

    // Calculate the vertical position of the comment
    const yPosition =
      mode === 'bottom'
        ? totalHeight - (trackIndex + 1) * trackHeight
        : trackIndex * trackHeight;

    return yPosition;
  }

  /* eslint no-invalid-this: 0 */

  /**
   * Danmaku animation function to calculate and update the positions of comments.
   * @param {Function} framing - Function to handle the framing of the stage.
   * @param {Function} setup - Function to set up new comments.
   * @param {Function} render - Function to render comments on the stage.
   * @param {Function} remove - Function to remove comments from the stage.
   * @returns {Function} - The animation function to be called with a timestamp.
   */
  function createEngine(framing, setup, render, remove) {
    return function animate(_timestamp) {
      // If timestamp is not provided, use performance.now()
      let timestamp = _timestamp;
      if (typeof timestamp === 'undefined') {
        timestamp = Date.now();
      }

      // Handle the framing of the stage
      framing(this._.stage);
      // Convert timestamp to seconds for consistency
      const dn = timestamp / 1000;
      // Get current time from media or use the timestamp
      const ct = this.media ? this.media.currentTime : dn;
      // Get playback rate, default to 1 if no media
      const pbr = this.media ? this.media.playbackRate : 1;

      let cmt = null;
      let cmtt = 0;
      let i = 0;

      // Iterate through running comments in reverse order to remove expired ones
      for (i = this._.runningList.length - 1; i >= 0; i--) {
        cmt = this._.runningList[i];
        cmtt = this.media ? cmt.time : cmt._utc;

        // Calculate elapsed time for the comment
        const elapsedTime = (dn - cmt._utc) * pbr;

        let shouldRemove = false;

        if (cmt.mode === 'top' || cmt.mode === 'bottom') {
          // Time-based removal for static comments
          if (elapsedTime > this._.duration) {
            shouldRemove = true;
          }
        } else if (cmt.mode === 'ltr') {
          // Remove when comment has moved off the right side of the screen
          if (cmt.x > this._.width) {
            shouldRemove = true;
          }
        } else if (cmt.mode === 'rtl') {
          // Remove when comment has moved off the left side of the screen
          if (cmt.x + cmt.width < 0) {
            shouldRemove = true;
          }
        }

        if (shouldRemove) {
          remove(this._.stage, cmt);
          this._.runningList.splice(i, 1);
        }
      }

      const pendingList = [];

      // Add new comments that should appear at the current time
      while (this._.position < this.comments.length) {
        cmt = this.comments[this._.position];
        cmtt = this.media ? cmt.time : cmt._utc;
        // Break if the comment time is in the future
        if (cmtt >= ct) {
          break;
        }
        // Skip comments that are out of duration
        if (ct - cmtt > this._.duration) {
          ++this._.position;
          continue;
        }
        if (this.media) {
          // Synchronize the comment's UTC time with the media's current time
          cmt._utc = dn - (this.media.currentTime - cmt.time);
        }
        pendingList.push(cmt);
        ++this._.position;
      }
      // Set up new comments
      setup(this._.stage, pendingList);
      // Allocate positions for new comments and add them to the running list
      for (i = 0; i < pendingList.length; i++) {
        cmt = pendingList[i];
        cmt.y = allocate.call(this, cmt);
        this._.runningList.push(cmt);
      }
      // Update positions of running comments
      for (i = 0; i < this._.runningList.length; i++) {
        cmt = this._.runningList[i];
        // Skip if the comment is not allocated a position
        if (cmt.y === -1) {
          continue;
        }
        const elapsedTime = (dn - cmt._utc) * pbr;
        const progress = elapsedTime / this._.duration;
        const distanceTraveled = this._.width * progress;

        if (cmt.mode === 'ltr') {
          // Start from -cmt.width and move to this._.width
          cmt.x = -cmt.width + distanceTraveled;
        } else if (cmt.mode === 'rtl') {
          // Start from this._.width and move to -cmt.width
          cmt.x = this._.width - distanceTraveled;
        } else if (cmt.mode === 'top' || cmt.mode === 'bottom') {
          // Center the comment horizontally
          cmt.x = (this._.width - cmt.width) / 2;
        }
        // If using DOM elements, use CSS transforms for smoother rendering
        if (cmt.element && cmt.element.style) {
          cmt.element.style.transform = `translate(${cmt.x}px, ${cmt.y}px)`;
        }
        // Render the comment
        render(this._.stage, cmt);
      }
    };
  }

  var raf =
    (
      typeof window !== 'undefined' &&
      (
        window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame
      )
    ) ||
    function(cb) {
      return setTimeout(cb, 50 / 3);
    };

  var caf =
    (
      typeof window !== 'undefined' &&
      (
        window.cancelAnimationFrame ||
        window.mozCancelAnimationFrame ||
        window.webkitCancelAnimationFrame
      )
    ) ||
    clearTimeout;

  function binsearch(arr, prop, key) {
    var mid = 0;
    var left = 0;
    var right = arr.length;
    while (left < right - 1) {
      mid = (left + right) >> 1;
      if (key >= arr[mid][prop]) {
        left = mid;
      } else {
        right = mid;
      }
    }
    if (arr[left] && key < arr[left][prop]) {
      return left;
    }
    return right;
  }


  function formatMode(mode) {
    if (!/^(ltr|top|bottom)$/i.test(mode)) {
      return 'rtl';
    }
    return mode.toLowerCase();
  }

  function collidableRange() {
    // var max = 9007199254740991;
    // return [
    //   { range: 0, time: -max, width: max, height: 0 },
    //   { range: max, time: max, width: 0, height: 0 }
    // ];
    return [];
  }

  function resetSpace(space) {
    space.ltr = collidableRange();
    space.rtl = collidableRange();
    space.top = collidableRange();
    space.bottom = collidableRange();
  }

  /* eslint no-invalid-this: 0 */
  function play() {
    if (!this._.visible || !this._.paused) {
      return this;
    }
    this._.paused = false;
    if (this.media) {
      for (var i = 0; i < this._.runningList.length; i++) {
        var cmt = this._.runningList[i];
        cmt._utc = Date.now() / 1000 - (this.media.currentTime - cmt.time);
      }
    }
    var that = this;
    var engine = createEngine(
      this._.engine.framing.bind(this),
      this._.engine.setup.bind(this),
      this._.engine.render.bind(this),
      this._.engine.remove.bind(this)
    );
    function frame() {
      engine.call(that);
      that._.requestID = raf(frame);
    }
    this._.requestID = raf(frame);
    return this;
  }

  /* eslint no-invalid-this: 0 */
  function pause() {
    if (!this._.visible || this._.paused) {
      return this;
    }
    this._.paused = true;
    caf(this._.requestID);
    this._.requestID = 0;
    return this;
  }

  /* eslint no-invalid-this: 0 */
  function seek() {
    if (!this.media) {
      return this;
    }
    this.clear();
    resetSpace(this._.space);
    var position = binsearch(this.comments, 'time', this.media.currentTime);
    this._.position = Math.max(0, position - 1);
    return this;
  }

  /* eslint no-invalid-this: 0 */
  function bindEvents(_) {
    _.play = play.bind(this);
    _.pause = pause.bind(this);
    _.seeking = seek.bind(this);
    this.media.addEventListener('play', _.play);
    this.media.addEventListener('pause', _.pause);
    this.media.addEventListener('playing', _.play);
    this.media.addEventListener('waiting', _.pause);
    this.media.addEventListener('seeking', _.seeking);
  }

  /* eslint no-invalid-this: 0 */
  function unbindEvents(_) {
    this.media.removeEventListener('play', _.play);
    this.media.removeEventListener('pause', _.pause);
    this.media.removeEventListener('playing', _.play);
    this.media.removeEventListener('waiting', _.pause);
    this.media.removeEventListener('seeking', _.seeking);
    _.play = null;
    _.pause = null;
    _.seeking = null;
  }

  /* eslint-disable no-invalid-this */
  function init(opt) {
    this._ = {};
    this.container = opt.container || document.createElement('div');
    this.media = opt.media;
    this._.visible = true;
    /* istanbul ignore next */
    {
      this.engine = 'canvas';
      this._.engine = canvasEngine;
    }
    /* eslint-enable no-undef */
    this._.requestID = 0;

    this._.speed = Math.max(0, opt.speed) || 144;
    this._.duration = 4;

    this.comments = opt.comments || [];
    this.comments.sort(function(a, b) {
      return a.time - b.time;
    });
    for (var i = 0; i < this.comments.length; i++) {
      this.comments[i].mode = formatMode(this.comments[i].mode);
    }
    this._.runningList = [];
    this._.position = 0;

    this._.paused = true;
    if (this.media) {
      this._.listener = {};
      bindEvents.call(this, this._.listener);
    }

    this._.stage = this._.engine.init(this.container);
    this._.stage.style.cssText += 'position:relative;pointer-events:none;';

    this.resize();
    this.container.appendChild(this._.stage);

    this._.space = {};
    resetSpace(this._.space);

    if (!this.media || !this.media.paused) {
      seek.call(this);
      play.call(this);
    }
    return this;
  }

  /* eslint-disable no-invalid-this */
  function destroy() {
    if (!this.container) {
      return this;
    }

    pause.call(this);
    this.clear();
    this.container.removeChild(this._.stage);
    if (this.media) {
      unbindEvents.call(this, this._.listener);
    }
    for (var key in this) {
      /* istanbul ignore else  */
      if (Object.prototype.hasOwnProperty.call(this, key)) {
        this[key] = null;
      }
    }
    return this;
  }

  var properties = ['mode', 'time', 'text', 'render', 'style'];

  /* eslint-disable no-invalid-this */
  function emit(obj) {
    if (!obj || Object.prototype.toString.call(obj) !== '[object Object]') {
      return this;
    }
    var cmt = {};
    for (var i = 0; i < properties.length; i++) {
      if (obj[properties[i]] !== undefined) {
        cmt[properties[i]] = obj[properties[i]];
      }
    }
    cmt.text = (cmt.text || '').toString();
    cmt.mode = formatMode(cmt.mode);
    cmt._utc = Date.now() / 1000;
    if (this.media) {
      var position = 0;
      if (cmt.time === undefined) {
        cmt.time = this.media.currentTime;
        position = this._.position;
      } else {
        position = binsearch(this.comments, 'time', cmt.time);
        if (position < this._.position) {
          this._.position += 1;
        }
      }
      this.comments.splice(position, 0, cmt);
    } else {
      this.comments.push(cmt);
    }
    return this;
  }

  /* eslint-disable no-invalid-this */
  function show() {
    if (this._.visible) {
      return this;
    }
    this._.visible = true;
    if (this.media && this.media.paused) {
      return this;
    }
    seek.call(this);
    play.call(this);
    return this;
  }

  /* eslint-disable no-invalid-this */
  function hide() {
    if (!this._.visible) {
      return this;
    }
    pause.call(this);
    this.clear();
    this._.visible = false;
    return this;
  }

  /* eslint-disable no-invalid-this */
  function clear() {
    this._.engine.clear(this._.stage, this._.runningList);
    this._.runningList = [];
    return this;
  }

  /* eslint-disable no-invalid-this */
  function resize() {
    this._.width = this.container.offsetWidth;
    this._.height = this.container.offsetHeight;
    this._.engine.resize(this._.stage, this._.width, this._.height);
    this._.duration = this._.width / this._.speed;
    return this;
  }

  var speed = {
    get: function() {
      return this._.speed;
    },
    set: function(s) {
      if (typeof s !== 'number' ||
        isNaN(s) ||
        !isFinite(s) ||
        s <= 0) {
        return this._.speed;
      }
      this._.speed = s;
      if (this._.width) {
        this._.duration = this._.width / s;
      }
      return s;
    }
  };

  function Danmaku(opt) {
    opt && init.call(this, opt);
  }
  Danmaku.prototype.destroy = function() {
    return destroy.call(this);
  };
  Danmaku.prototype.emit = function(cmt) {
    return emit.call(this, cmt);
  };
  Danmaku.prototype.show = function() {
    return show.call(this);
  };
  Danmaku.prototype.hide = function() {
    return hide.call(this);
  };
  Danmaku.prototype.clear = function() {
    return clear.call(this);
  };
  Danmaku.prototype.resize = function() {
    return resize.call(this);
  };
  Object.defineProperty(Danmaku.prototype, 'speed', speed);

  return Danmaku;

}));
