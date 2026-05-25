import { DebugOverlay } from './DebugOverlay.js';
import { HoverActionIndicator } from './HoverActionIndicator.js';
import { IngredientNameSignboard } from './IngredientNameSignboard.js';
import { IngredientTraitOverlay } from './IngredientTraitOverlay.js';
import { InventoryBar } from './InventoryBar.js';
import { getVisibleGameArea } from './viewport.js';

export class GameUi {
  constructor(scene) {
    this.scene = scene;
    this.hoverActionObject = null;
    this.ingredientNameObject = null;
    this.ingredientTraitObject = null;

    this.nameSignboard = new IngredientNameSignboard(scene);
    this.ingredientTraits = new IngredientTraitOverlay(scene);
    this.hoverActions = new HoverActionIndicator(scene);
    this.inventoryBar = new InventoryBar(scene);
    this.debugOverlay = new DebugOverlay(scene);
  }

  position() {
    const visibleArea = getVisibleGameArea(this.scene.scale);

    this.nameSignboard.position(visibleArea);
    this.ingredientTraits.position(visibleArea);
    this.hoverActions.position(visibleArea);
    this.inventoryBar.position(visibleArea);
    this.debugOverlay.position(visibleArea);
  }

  update(time) {
    this.ingredientTraits.updatePosition();
    this.debugOverlay.update(time);
  }

  setHoverActions(modes, gameObject = null) {
    if (!modes?.length) {
      this.hoverActionObject = null;
      this.hoverActions.setModes([]);
      return;
    }

    this.hoverActionObject = gameObject;
    this.hoverActions.setModes(modes);
  }

  isHoverActionObject(gameObject) {
    return this.hoverActionObject === gameObject;
  }

  showIngredientName(gameObject, label) {
    this.ingredientNameObject = gameObject;
    this.nameSignboard.setText(label);
    this.nameSignboard.show();
  }

  hideIngredientName() {
    this.ingredientNameObject = null;
    this.nameSignboard.hide();
  }

  isIngredientNameObject(gameObject) {
    return this.ingredientNameObject === gameObject;
  }

  showIngredientTraits(gameObject) {
    this.ingredientTraitObject = gameObject;
    this.ingredientTraits.show(gameObject);
  }

  hideIngredientTraits() {
    this.ingredientTraitObject = null;
    this.ingredientTraits.hide();
  }

  isIngredientTraitObject(gameObject) {
    return this.ingredientTraitObject === gameObject;
  }

  setDragDebugInfo(lines = []) {
    this.debugOverlay.setDragInfo(lines);
  }

  setInventoryItems(items = []) {
    this.inventoryBar.setSlotItems(items);
  }

  destroy() {
    this.nameSignboard.destroy();
    this.ingredientTraits.destroy();
    this.hoverActions.destroy();
    this.inventoryBar.destroy();
    this.debugOverlay.destroy();
  }
}
