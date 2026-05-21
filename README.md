# Sushi Sensei

Minimal Phaser 3 project using Vite.

## Structure

```text
public/
  assets/        Static files loaded by Phaser, available from /assets/...
src/
  game/          Phaser game configuration and shared constants
  objects/       Reusable Phaser game object classes
  scenes/        Phaser.Scene classes
  systems/       Cross-object gameplay logic
  managers/      App-level coordination helpers
  ui/            Reusable UI game objects
  utils/         Pure helper functions
  main.js        Browser entry point
  styles.css     Page and canvas styles
```

## OOP Layout

Scenes coordinate the current screen, objects own their rendering and behavior, and systems handle gameplay logic that spans multiple objects.

Current scene flow:

```text
PreloadScene -> GameScene
```

## Commands

```powershell
npm.cmd run dev
npm.cmd run build
```
