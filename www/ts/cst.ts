class CoordinateSystemTransformer {

    private cfg;

    private wcs;
    private ccs;
    private gamma: number;

    constructor() {

        this.wcs = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            gamma: 0
        };

        this.cfg = {
            win: {
                x0: 0,
                y0: 0,
                x: 0,
                y: 0,
                w: 0,
                h: 0,
                dx: 0,
                dy: 0
            },
            rcs: {
                x0: 0,
                y0: 0,
                x: 0,
                y: 0,
                z: 0,
                z0: 0,
                angle: 0,
                cos: 0,
                sin: 0,
                dx: 0,
                dy: 0,
                rdx: 0,
                rdy: 0
            },  // rectangular coordinate system
            gamma: 0
        };
    }


    public transformWCStoCCS() {
        // (w_x, w_y) --> (c_x, c_y)

        this.wcs.gamma = Math.min(this.wcs.width, this.wcs.height);

        this.ccs.z0 = 1 / this.wcs.gamma;

        this.ccs.dx = this.ccs.z * this.ccs.z0 * this.wcs.dx;
        this.ccs.dy = -this.ccs.z * this.ccs.z0 * this.wcs.dy;

        this.ccs.cos = Math.cos(this.ccs.angle);
        this.ccs.sin = Math.sin(this.ccs.angle);

        this.ccs.rdx = this.ccs.cos * this.ccs.dx - this.ccs.sin * this.ccs.dy;
        this.ccs.rdy = this.ccs.sin * this.ccs.dx + this.ccs.cos * this.ccs.dy;

        this.ccs.x = this.ccs.x0 + this.ccs.rdx;
        this.ccs.y = this.ccs.y0 + this.ccs.rdy;

    }


    public transformCCStoWCS() {
        // (c_x, c_y) --> (w_x, w_y)
    }

    // CCS

    public getCX(): number {
        return this.cx;
    }

    public getCY(): number {
        return this.cy;
    }



    public getCAngle(): number {
        return this.angle;
    }

    public setCAngle(angle: number): void {
        this.angle = angle;
        // TODO react
    }

    // WCS

    public getWX(): number {
        return this.wx;
    }

    public getWY(): number {
        return this.wy;
    }
}