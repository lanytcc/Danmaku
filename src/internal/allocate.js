/* eslint no-invalid-this: 0 */
export default function(cmt) {
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
      new Array(numberOfTracks).fill(null).map(() => ({ time: 0, width: 0, height: 0 }));
  }

  const tracks = that._.space[mode];
  let trackIndex = -1;

  // Check if a comment can be placed on a track
  function canPlaceCommentOnTrack(track, cmt, ct, pbr, mode, _that) {
    if (!track || !track.time) {
      return true;
    }

    var elapsedTime = ct - track.time;
    var duration = _that._.duration / pbr;

    if (mode === 'top' || mode === 'bottom') {
      // Check if the display time is over
      return elapsedTime >= duration;
    }
    // Check if the comment will collide with the track
    var trackDuration = _that._.duration / pbr;

    // Calculate the speed of the comment
    var trackSpeed = (_that._.width + track.width) / trackDuration;

    // Calculate the current position
    var cmtPosition = _that._.width;
    var trackPosition = _that._.width - trackSpeed * elapsedTime;

    // Adjust the direction if the comment is from left to right
    if (mode === 'ltr') {
      cmtPosition = -cmt.width;
      trackPosition = track.width + trackSpeed * elapsedTime;
      // cmtSpeed = -cmtSpeed;
      trackSpeed = -trackSpeed;
    }

    // Check if the comment overlaps with the track
    if (cmtPosition < trackPosition + track.width) {
      return false;
    }
    return true;
  }

  // Traverse tracks to find an available track
  for (let i = 0; i < numberOfTracks; i++) {
    if (canPlaceCommentOnTrack(tracks[i], cmt, ct, pbr, mode, that)) {
      trackIndex = i;
      break;
    }
  }

  // If no track is available, return -1
  if (trackIndex === -1) {
    return -1;
  }

  // Update track information
  tracks[trackIndex] = {
    time: that.media ? cmt.time : cmt._utc,
    width: cmt.width,
    height: cmt.height,
  };

  // Calculate the vertical position of the comment
  const yPosition = mode === 'bottom' ? totalHeight - (trackIndex + 1) * trackHeight : trackIndex * trackHeight;

  return yPosition;
}
