# TODO

* [x] Stop out-of-date Workers for quick reuse.
* [ ] Write a palette editor.
* [ ] Live edit palette.
* [ ] Be able to set the center complex number and zoom level in the URL query.
* [ ] Make dedicated web workers only compute the number of iterations for each pixel and move the coloring part to the main thread.
  * It'll make it easy to use histogram coloring.
  * It'll make it really cheap and easy to change the palette live.
* [ ] Border tracing / edge checking to speed up computation.
* [ ] Use BigNum for deep enough zooms.
* [ ] Rectangle checking (?)
* [ ] Adjustable anti-aliasing
* [ ] Utilize symmetry
* [ ] Support different pointers (e.g. mice, etc.)
* [ ] Different modes to interact with canvas
  * [ ] Select section of canvas to zoom into
  * [ ] Zoom in/out at the center of canvas
  * [ ] Zoom in/out where pointer is
* [ ] Support rotation
* [ ] Be able to see current complex number center and zoom level and be able to edit it.
* [ ] Adjustable max. iterations.
* [ ] Adjust image size, e.g. scaled version or "full screen".
* [ ] Change number of workers.
* [ ] Gradually increasing resolution.
* [ ] Enable GPU support (maybe)
* [ ] Enable WASM support (maybe)
