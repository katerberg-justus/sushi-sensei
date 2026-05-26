import { CuttableFish } from './CuttableFish.js';

export class CuttableSquid extends CuttableFish {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y, {
      ...options,
      fishType: 'ika',
    });
  }
}
