import allocate from '../internal/allocate.js';

/* eslint no-invalid-this: 0 */
export default function(framing, setup, render, remove) {
  return function() {
    framing(this._.stage);
    const dn = Date.now() / 1000;
    const ct = this.media ? this.media.currentTime : dn;
    const pbr = this.media ? this.media.playbackRate : 1;
    var cmt = null;
    var cmtt = 0;
    var i = 0;
    for (i = this._.runningList.length - 1; i >= 0; i--) {
      cmt = this._.runningList[i];
      cmtt = this.media ? cmt.time : cmt._utc;
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
    var pendingList = [];
    while (this._.position < this.comments.length) {
      cmt = this.comments[this._.position];
      cmtt = this.media ? cmt.time : cmt._utc;
      if (cmtt >= ct) {
        break;
      }
      // when clicking controls to seek, media.currentTime may changed before
      // `pause` event is fired, so here skips comments out of duration,
      // see https://github.com/weizhenye/Danmaku/pull/30 for details.
      if (ct - cmtt > this._.duration) {
        ++this._.position;
        continue;
      }
      if (this.media) {
        cmt._utc = dn - (this.media.currentTime - cmt.time);
      }
      pendingList.push(cmt);
      ++this._.position;
    }
    setup(this._.stage, pendingList);
    for (i = 0; i < pendingList.length; i++) {
      cmt = pendingList[i];
      cmt.y = allocate.call(this, cmt);
      this._.runningList.push(cmt);
    }
    for (i = 0; i < this._.runningList.length; i++) {
      cmt = this._.runningList[i];
      if (cmt.y === -1) {
        continue;
      }
      const elapsedTime = (dn - cmt._utc) * pbr;
      const progress = elapsedTime / this._.duration;
      const distanceTraveled = this._.width * progress;

      if (cmt.mode === 'ltr') {
        // Start from -cmt.width and move to this._.width
        cmt.x = (-cmt.width + distanceTraveled + 0.5) | 0;
      }
      if (cmt.mode === 'rtl') {
        // Start from this._.width and move to -cmt.width
        cmt.x = (this._.width - distanceTraveled + 0.5) | 0;
      }
      if (cmt.mode === 'top' || cmt.mode === 'bottom') {
        cmt.x = (this._.width - cmt.width) >> 1;
      }
      render(this._.stage, cmt);
    }
  };
}
