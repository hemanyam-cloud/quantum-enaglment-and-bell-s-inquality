/**
 * Complex number arithmetic and linear algebra primitives for quantum simulations.
 */

export class Complex {
  constructor(re = 0, im = 0) {
    this.re = Number(re);
    this.im = Number(im);
  }

  static zero() {
    return new Complex(0, 0);
  }

  static one() {
    return new Complex(1, 0);
  }

  static i() {
    return new Complex(0, 1);
  }

  static fromPolar(r, theta) {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }

  clone() {
    return new Complex(this.re, this.im);
  }

  add(c) {
    const o = c instanceof Complex ? c : new Complex(c, 0);
    return new Complex(this.re + o.re, this.im + o.im);
  }

  sub(c) {
    const o = c instanceof Complex ? c : new Complex(c, 0);
    return new Complex(this.re - o.re, this.im - o.im);
  }

  mul(c) {
    if (typeof c === 'number') {
      return new Complex(this.re * c, this.im * c);
    }
    return new Complex(
      this.re * c.re - this.im * c.im,
      this.re * c.im + this.im * c.re
    );
  }

  div(c) {
    if (typeof c === 'number') {
      return new Complex(this.re / c, this.im / c);
    }
    const denom = c.re * c.re + c.im * c.im;
    if (denom === 0) throw new Error('Division by zero in Complex.div');
    return new Complex(
      (this.re * c.re + this.im * c.im) / denom,
      (this.im * c.re - this.re * c.im) / denom
    );
  }

  conj() {
    return new Complex(this.re, -this.im);
  }

  abs() {
    return Math.hypot(this.re, this.im);
  }

  absSq() {
    return this.re * this.re + this.im * this.im;
  }

  phase() {
    return Math.atan2(this.im, this.re);
  }

  toString(digits = 4) {
    const r = this.re.toFixed(digits);
    const i = Math.abs(this.im).toFixed(digits);
    if (Math.abs(this.im) < 1e-10) return `${r}`;
    if (Math.abs(this.re) < 1e-10) return `${this.im >= 0 ? '' : '-'}${i}i`;
    return `${r} ${this.im >= 0 ? '+' : '-'} ${i}i`;
  }
}

export function c(re, im = 0) {
  return new Complex(re, im);
}
