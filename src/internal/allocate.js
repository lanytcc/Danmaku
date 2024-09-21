import { now } from '../utils.js';
/* eslint no-invalid-this: 0 */
export default function(cmt) {
  const that = this;
  const ct = that.media ? that.media.currentTime : now() / 1000;
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
