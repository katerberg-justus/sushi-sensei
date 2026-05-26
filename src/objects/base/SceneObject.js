import * as Phaser from 'phaser/dist/phaser.esm.js';

export class SceneObject extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);

    scene.add.existing(this);
  }
}
