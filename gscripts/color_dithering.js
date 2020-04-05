// @ts-ignore
clear();

var body = document.querySelector("body");
body.style.margin = "0";
body.style.display = "flex";
body.innerHTML = ""

var canvas = document.createElement("canvas");
canvas.style.flexGrow = "1";
body.appendChild(canvas);



var div_1 = document.createElement("div");
div_1.style.flexGrow = "1";
div_1.innerHTML = `

  From color:<br/>
  r: <input id="cfr" type="range" min="0" max="1" value="0.0" step="0.0001"><br/>
  g: <input id="cfg" type="range" min="0" max="1" value="0.0" step="0.0001"><br/>
  b: <input id="cfb" type="range" min="0" max="1" value="0.0" step="0.0001"><br/>
  a: <input id="cfa" type="range" min="0" max="1" value="1.0" step="0.0001"><br/>
  <br/>
  To color:<br/>
  r: <input id="ctr" type="range" min="0" max="1" value="1.0" step="0.0001"><br/>
  g: <input id="ctg" type="range" min="0" max="1" value="1.0" step="0.0001"><br/>
  b: <input id="ctb" type="range" min="0" max="1" value="1.0" step="0.0001"><br/>
  a: <input id="cta" type="range" min="0" max="1" value="1.0" step="0.0001"><br/>
  <br/>
  <button id="btn_dithering">Toggle dithering</button>

`;
body.appendChild(div_1);

var ctx = canvas.getContext("2d");

var image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);


var color_from = [0.9, 0.0, 0.0, 1.0];
var color_to = [0.0, 0.5, 1.0, 1.0];

var use_dithering = false;

color_from[0] = Number.parseFloat($("#cfr").value);
color_from[1] = Number.parseFloat($("#cfg").value);
color_from[2] = Number.parseFloat($("#cfb").value);
color_from[3] = Number.parseFloat($("#cfa").value);

color_to[0] = Number.parseFloat($("#ctr").value);
color_to[1] = Number.parseFloat($("#ctg").value);
color_to[2] = Number.parseFloat($("#ctb").value);
color_to[3] = Number.parseFloat($("#cta").value);

$("#cfr").oninput = (e) => {
  const v = Number.parseFloat(e.target.value);
  color_from[0] = v;
};
$("#cfg").oninput = (e) => {
  const v = Number.parseFloat(e.target.value);
  color_from[1] = v;
};
$("#cfb").oninput = (e) => {
  const v = Number.parseFloat(e.target.value);
  color_from[2] = v;
};
$("#cfa").oninput = (e) => {
  const v = Number.parseFloat(e.target.value);
  color_from[3] = v;
};


$("#ctr").oninput = (e) => {
  const v = Number.parseFloat(e.target.value);
  color_to[0] = v;
};
$("#ctg").oninput = (e) => {
  const v = Number.parseFloat(e.target.value);
  color_to[1] = v;
};
$("#ctb").oninput = (e) => {
  const v = Number.parseFloat(e.target.value);
  color_to[2] = v;
};
$("#cta").oninput = (e) => {
  const v = Number.parseFloat(e.target.value);
  color_to[3] = v;
};

$("#btn_dithering").onclick = (e) => {
  use_dithering = !use_dithering;
};


function* iterate_over_pixels_in_rectangle(rx, ry, rw, rh) {
  const x1 = rx;
  const x2 = rx + rw;

  const y1 = ry;
  const y2 = ry + rh;

  for (let y = y1; y < y2; y += 1) {
    for (let x = x1; x < x2; x += 1) {
      yield [x, y];
    }
  }
}

window.onresize = () => {
  canvas.width = 0;
  canvas.height = 0;
};

function lerp(v_0, v_1, t) {
  return (1.0 - t) * v_0 + t * v_1;
}

function clamp(v, min, max) {
  if (v < min) {
    return min;
  } else if (v > max) {
    return max;
  } else {
    return v;
  }
}

function render() {
  if (!(canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight)) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  const w = canvas.width;
  const h = canvas.height;

  ctx.fillRect(0, 0, w, h);

  const { data } = image_data;


  for (const [x, y] of iterate_over_pixels_in_rectangle(0, 0, w, h)) {
    const idx = 4 * (x + w * y);

    const t = x / w;

    for (let i = 0; i < 4; i += 1) {
      const c1 = color_from[i];
      const c2 = color_to[i];

      let c = lerp(c1, c2, t);
      c = 256 * c;

      const ci = Math.floor(c);
      const cf = c - ci;

      if (use_dithering) {
        c = ci + ((Math.random() < cf) ? 1 : 0);
      } else {
        c = Math.round(ci + cf);
      }



      data[idx + i] = clamp(c, 0, 255);
    }
  }

  ctx.putImageData(image_data, 0, 0);
}

function animate() {
  render();
  window.requestAnimationFrame(animate);
}

animate();
