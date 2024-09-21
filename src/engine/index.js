import allocate from '../internal/allocate.js';
import { now } from '../utils.js';

/* eslint no-invalid-this: 0 */

/**
 * Danmaku animation function to calculate and update the positions of comments.
 * @param {Function} framing - Function to handle the framing of the stage.
 * @param {Function} setup - Function to set up new comments.
 * @param {Function} render - Function to render comments on the stage.
 * @param {Function} remove - Function to remove comments from the stage.
 * @returns {Function} - The animation function to be called with a timestamp.
 */
export default function(framing, setup, render, remove) {
  return function animate(_timestamp) {
    // If timestamp is not provided, use performance.now()
    let timestamp = _timestamp;
    if (typeof timestamp === 'undefined') {
      timestamp = now();
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
