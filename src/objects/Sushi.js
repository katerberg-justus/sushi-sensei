import * as Phaser from 'phaser/dist/phaser.esm.js';
import { COLORS } from '../game/constants.js';

export class Sushi extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);

    this.plate = scene.add.ellipse(0, 50, 340, 110, COLORS.plate);
    this.plateShadow = scene.add.ellipse(0, 58, 292, 58, 0xd2e1e4, 1);

    this.rice = scene.add.rectangle(0, 0, 190, 78, COLORS.rice, 1);
    this.riceShade = scene.add.rectangle(0, 22, 190, 20, COLORS.riceStroke, 1);

    this.fish = scene.add.rectangle(0, -18, 210, 44, COLORS.salmon, 1);
    this.fishShade = scene.add.rectangle(0, -2, 210, 12, COLORS.salmonStroke, 1);

    this.add([this.plate, this.plateShadow, this.rice, this.riceShade, this.fish, this.fishShade]);
    scene.add.existing(this);
  }
}
