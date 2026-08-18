# Interactive PAWS demo assets

This directory contains the media and pre-ranked overlay metadata for the four
10-second comparison clips selected for the web demo.

## Contents

- `manifest.json`: video dimensions, FPS, clip offsets, and JSON paths.
- `videos/*.mp4`: clean H.264 source clips without rendered overlays.
- `results/<video>/*.json`: frame-timed relation overlays.

Each video has five selectable result files:

- `gt.json`: every annotated person-object relation (no Top-K/object limit).
- `sttran.json`: fully-supervised STTran.
- `pla.json`: PLA.
- `paws_without_pa.json`: PAWS ranked without pair affinity.
- `paws_with_pa.json`: PAWS ranked with pair affinity.

Prediction JSONs use Top-10 atomic relations and at most three object
instances. All Top-10 predicates assigned to a selected object are grouped
under one numbered arrow.

Frame records use clip-relative seconds. A browser should select the latest
record whose `time` is less than or equal to the video's `currentTime`, then
draw its boxes, arrows, numbers, and predicate legend on a canvas.
