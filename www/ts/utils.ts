class Utils {

    public static shuffle(array: any[]): void {
        let currentIndex = array.length;
        let temporaryValue;
        let randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
    }

    /**
     * Converts an RGB color value to HSL. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes r, g, and b are contained in the set [0, 255] and
     * returns h, s, and l in the set [0, 1].
     *
     * @param   {Number}  r       The red color value
     * @param   {Number}  g       The green color value
     * @param   {Number}  b       The blue color value
     * @return  {Array}           The HSL representation
     */

    public static rgbToHsl(r: number, g: number, b: number): number[] {
        r /= 255;
        g /= 255;
        b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return [h, s, l];
    }


    /**
     *
     * @param imageData
     * @param x
     * @param y
     * @param r
     * @param g
     * @param b
     * @param a
     */
    public static setPixel(imageData: ImageData, x: number, y: number, r: number, g: number, b: number, a: number) {
        let index = (x + y * imageData.width) * 4;
        imageData.data[index] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
        imageData.data[index + 3] = a;
    }

    public static getSSArray(x_min: number, x_max: number, y_min: number, y_max: number,
                             x_splits: number, y_splits: number): {
        index: any[],
        x: any[],
        y: any[]
    } {
        let i;

        let x = [];
        let y = [];

        if (x_splits < 2) {
            x.push(0);
        }
        else {
            // Normalize
            x_splits = Math.round(x_splits);

            let dx = (x_max - x_min) / x_splits;

            // First element
            x.push(dx / 2 + x_min);

            for (i = 1; i < x_splits; i++) {
                x.push(x[i - 1] + dx);
            }
        }

        if (y_splits < 2) {
            y.push(0);
        }
        else {
            // Normalize
            y_splits = Math.round(y_splits);

            let dy = (y_max - y_min) / y_splits;

            // First element
            y.push(dy / 2 + y_min);

            for (let i = 1; i < y_splits; i++) {
                y.push(y[i - 1] + dy);
            }
        }

        ////////

        // TODO do I need to do this? Does the compiler realise this? this is const
        let LENGTH = x.length * y.length;

        let index = [];

        for (i = 0; i < LENGTH; i++) {
            index.push({
                x: x[i % x.length],
                y: y[Math.floor(i / x.length) % y.length]
            });
        }

        return {
            index: index,
            x: x,
            y: y
        };
    }

    public static getObjectSize(obj): number {

        let key, count = 0;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                count++;
            }
        }

        return count;
    }

    public static hue2rgb(p: number, q: number, t: number): number {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    /**
     * Converts an HSL color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes h, s, and l are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     *
     * @param   {Number}  h       The hue
     * @param   {Number}  s       The saturation
     * @param   {Number}  l       The lightness
     * @return  {Array}           The RGB representation
     */
    public static hslToRgb(h: number, s: number, l: number): number[] {
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            let p = 2 * l - q;

            r = Utils.hue2rgb(p, q, h + 1 / 3);
            g = Utils.hue2rgb(p, q, h);
            b = Utils.hue2rgb(p, q, h - 1 / 3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    public static hslToRgbRW(h: number, s: number, l: number, arr: number[]): void {
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            let p = 2 * l - q;

            r = Utils.hue2rgb(p, q, h + 1 / 3);
            g = Utils.hue2rgb(p, q, h);
            b = Utils.hue2rgb(p, q, h - 1 / 3);
        }

        arr[0] = Math.round(r * 255);
        arr[1] = Math.round(g * 255);
        arr[2] = Math.round(b * 255);
    }
}
