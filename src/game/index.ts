import * as Phaser from "phaser";

import { Dice } from "./dice";

const startXPos = window.innerWidth / 2 - 210;
const startYPos = window.innerHeight / 2 - 50;

const onScenePreload = (scene: Phaser.Scene) => {
  scene.load.spritesheet("dice", "assets/images/dice2.png", {
    frameWidth: 96,
    frameHeight: 96,
  });
  scene.load.image("background", "assets/images/background2.jpg");
  scene.load.image('shelf', 'assets/images/shelf.jpeg');
};

const onSceneCreate = (scene: Phaser.Scene, onClick: Function) => {
  const platforms = scene.physics.add.staticGroup();

  const dices = [
    new Dice(scene, startXPos, startYPos, () => onClick(1)),
    new Dice(scene, startXPos + 100, startYPos, () => onClick(2)),
    new Dice(scene, startXPos + 200, startYPos, () => onClick(3)),
    new Dice(scene, startXPos + 300, startYPos, () => onClick(4)),
    new Dice(scene, startXPos + 400, startYPos, () => onClick(5)),
  ];

  dices.forEach(dice => scene.physics.add.collider(dice.sprite, platforms))

  return dices;
};

export class FarkleGame {
  scene!: Phaser.Scene;
  dices: Dice[] = [];


  constructor(private onClick: Function) { }

  start(gameWindowId: string) {
    const that = this;

    new Phaser.Game({
      type: Phaser.AUTO,
      parent: gameWindowId,
      width: "100",
      height: "100",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0 },
        },
      },
      scene: {
        preload: function () {
          onScenePreload(this);
        },
        create: function () {
          that.scene = this;
          that.dices.push(...onSceneCreate(this, that.onClick))
        },
      },
      transparent: true,
    });
  }

  throwDices(values: number[]) {
    this.dices.forEach((dice, i) => {
      dice.sprite.setY(startYPos);
      dice.throwDice(values[i]);
    });
  }
}
