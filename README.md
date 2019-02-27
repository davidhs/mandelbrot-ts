# Mandelbrot (TS)

![](res/mandelbrot.png)

## Build

```sh
npm install
npm run build
```

## NOTE

* TypeScript doesn't like that I use libraries `webworker` and `dom` simulatenously.

## TODO

* [ ] Preview mode
* [ ] Boundary check
* [ ] Worker roles, boundary checking workers and quick drawing workers
* [ ] Stop out-of-date Workers for quick reuse
* [ ] Enable super sampling