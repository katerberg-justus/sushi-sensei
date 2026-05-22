import { CuttableFish } from './CuttableFish.js';

export class CuttableSalmon extends CuttableFish {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y, {
      ...options,
      fishType: 'salmon',
    });
  }
}
