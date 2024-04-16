const game = {
  cheats: {
    god: false
  },
  options: {
    state: {
      sound: true,
      music: true
    },
    async load() {
      const optText = window.localStorage.getItem('rloptions');
      if (!optText) {
        await game.options.save();
        return;
      }
      try {
        const optJson = JSON.parse(optText);
        Object.assign(game.options.state, optJson);
      } catch (err) {
        alert(err.message);
      }
    },
    async save() {
      const optJson = { ...game.options.state };
      const optText = JSON.stringify(optJson);
      window.localStorage.setItem('rloptions', optText);
    },
    set enableMusic(v) {
      game.options.state.music = !!v;
      game.options.save();
    },
    set enableSound(v) {
      game.options.state.sound = !!v;
      game.options.save();
    }
  },
  highscore: {
    state: {
      score: 0
    },
    get score() {
      return game.highscore.state.score;
    },
    async load() {
      const scText = window.localStorage.getItem('rlhs');
      if (!scText) {
        await game.highscore.save(0);
      }
      try {
        const scJson = JSON.parse(scText);
        Object.assign(game.highscore.state, scJson);
      } catch (err) {
        alert(err.message);
      }
    },
    async save(score) {
      if (typeof score !== 'number') {
        return;
      }
      if (score > game.highscore.state.score) {
        game.highscore.state.score = score;
        const scJson = { ...game.highscore.state };
        const scText = JSON.stringify(scJson);
        window.localStorage.setItem('rlhs', scText);
      }
    }
  },
  ui: {
    style() {
      Object.assign(document.body.style, {
        boxSizing: 'border-box',
        margin: 0,
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#000'
      });
      Object.assign(game.ui.canvas.style, {
        position: 'absolute'
      });
    },
    create() {
      game.ui.canvas = document.createElement('canvas');
      game.ui.ctx = game.ui.canvas.getContext('2d');
      document.body.appendChild(game.ui.canvas);
      game.ui.style();
      game.ui.resize();
      window.addEventListener('resize', game.ui.resize);
    },
    resize() {
      const logicalWidth = 40;
      const logicalHeight = 20;
      const logicalAspect = logicalHeight / logicalWidth;
      const availableWidth = window.innerWidth;
      const availableHeight = window.innerHeight;
      const isPortrait = availableHeight > availableWidth;
      const invAspect = 1 / logicalAspect;

      let nextWidth = availableWidth;
      let nextHeight = availableHeight;
      // if (isPortrait) {
      //   // match height and scale width
      //   nextHeight = availableHeight;
      //   nextWidth = availableWidth * logicalAspect;
      // } else {
      //   // match width and scale height
      //   nextWidth = availableWidth;
      //   nextHeight = nextWidth / invAspect;
      // }
      // match width and scale height
      nextWidth = availableWidth;
      nextHeight = nextWidth / invAspect;

      game.ui.width = logicalWidth;
      game.ui.height = logicalHeight;
      game.ui.pixelWidth = nextWidth / logicalWidth;
      game.ui.pixelHeight = nextHeight / logicalHeight;

      Object.assign(game.ui.canvas.style, {
        position: 'absolute',
        top: `${(availableHeight - nextHeight) / 2}px`,
        left: `${(availableWidth - nextWidth) / 2}px`
      });

      game.ui.canvas.width = nextWidth;
      game.ui.canvas.height = nextHeight;
      game.ui.update(game.render);
    },
    update(drawFn) {
      const {
        ctx,
        canvas: { width, height },
        pixelWidth,
        pixelHeight
      } = game.ui;

      ctx.fillStyle = '#131';
      ctx.fillRect(0, 0, width, height);

      // ctx.fillStyle = '#121';

      // for (let i = 0; i < width; i += pixelWidth) {
      //   ctx.fillRect(i, 0, 1, height);
      // }

      // for (let i = 0; i < height; i += pixelHeight) {
      //   ctx.fillRect(0, i, width, 1);
      // }

      typeof drawFn === 'function' && drawFn();

      game.ui.bloom();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (let i = 0; i < height; i += 2) {
        ctx.fillRect(0, i, width, 1);
      }
      // const gco = ctx.globalCompositeOperation;
      // ctx.globalCompositeOperation = 'overlay';
      // ctx.fillStyle = 'rgba(255, 150, 180, 0.3)';
      // // ctx.filter = 'blur(2px)';

      // for (let i = 0; i < height; i += 4) {
      //   ctx.fillRect(0, i, width, 1);
      // }
      // ctx.globalCompositeOperation = gco;
    },

    bloom() {
      const { canvas, ctx } = game.ui;

      const bcanvas = document.createElement('canvas');
      bcanvas.width = canvas.width;
      bcanvas.height = canvas.height;
      const bctx = bcanvas.getContext('2d');
      bctx.clearRect(0, 0, canvas.width, canvas.height);
      bctx.drawImage(canvas, 0, 0);
      bctx.filter = 'blur(3px)';

      const gco = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'color-dodge';
      ctx.drawImage(bcanvas, 0, 0);
      ctx.globalCompositeOperation = gco;
    },

    drawPixel(x, y) {
      const { ctx, pixelWidth, pixelHeight } = game.ui;
      const { penColor = '#fff' } = game.ui;
      ctx.fillStyle = penColor;
      ctx.fillRect(
        x * pixelWidth + 3,
        y * pixelHeight + 3,
        pixelWidth - 4,
        pixelHeight - 4
      );
    }
  },

  state: {
    title: true,
    gameOver: true,
    level: 1,
    score: 0,
    emptyRatio: 0.85,
    enemyRange: 10,
    monsters: 10,
    kills: 0
  },

  hero: {
    state: {
      health: 100,
      maxHealth: 100,
      worldX: 0,
      worldY: 0
    }
  },

  hud: {
    async render() {
      const { ctx, canvas, pixelWidth, pixelHeight, width, height } = game.ui;

      const hudX = game.map.columns * pixelWidth;
      const hudW = canvas.width - hudX;

      const lineHeight = 22;

      let cursorX = hudX + 8;
      let cursorY = 8;

      ctx.fillStyle = '#000';
      ctx.fillRect(hudX, 0, hudW, canvas.height);

      ctx.font = '16px fantasy';
      ctx.fillStyle = '#ccc';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      ctx.fillText(
        `Score: ${('0000000' + game.state.score).slice(-7)}`,
        cursorX,
        cursorY
      );

      cursorY += lineHeight - 4;

      const barWidth = canvas.width - cursorX - 8;

      const percentage = game.hero.state.health / game.hero.state.maxHealth;

      const barHeight = 16;
      const fillWidth = percentage * barWidth;

      ctx.fillStyle = '#222';
      ctx.fillRect(cursorX, cursorY, barWidth, barHeight);
      if (game.hero.state.health > 0) {
        const barColors = ['#800', '#800', '#850', '#080', '#080', '#080'];
        const barColorIndex = Math.floor(percentage * (barColors.length - 1));
        const barColor = barColors[barColorIndex];
        ctx.fillStyle = barColor;
        ctx.fillRect(cursorX, cursorY, fillWidth, barHeight);
      }
      ctx.fillStyle = '#ccc';

      cursorY += 20;

      ctx.fillText(
        `HP: ${game.hero.state.health} / ${game.hero.state.maxHealth}`,
        cursorX,
        cursorY
      );

      cursorY = canvas.height;
      cursorY -= lineHeight * 2;

      ctx.fillText(`Level: ${game.state.level}`, cursorX, cursorY);

      cursorY += lineHeight;

      ctx.fillText(
        `Monsters: ${game.state.monsters - game.state.kills}`,
        cursorX,
        cursorY
      );
    }
  },

  map: {
    columns: 30,
    rows: 20,
    data: [],

    setup() {
      const { columns, rows, data } = game.map;
      data.length = 0;
      // setup walls
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const r = Math.random();
          if (r > game.state.emptyRatio) {
            data.push('#');
          } else {
            data.push('.');
          }
        }
      }
      // setup entities
      const { monsters, level } = game.state;
      const iters = monsters;

      const findEmptyPosition = (search = 5000) => {
        let row = 0;
        let column = 0;
        row = Math.floor(Math.random() * rows);
        column = Math.floor(Math.random() * columns);
        let pos = column + row * columns;
        if (data[pos] === '.') {
          return [column, row];
        }
        while (search > 0) {
          row = Math.floor(Math.random() * rows);
          column = Math.floor(Math.random() * columns);
          pos = column + row * columns;
          if (data[pos] === '.') {
            return [column, row];
          }
          search--;
        }
        return [column, row];
      };

      for (let i = 0; i <= iters; i++) {
        const [column, row] = findEmptyPosition();
        const pos = column + row * columns;
        if (i === 0) {
          data[pos] = 'H';
          game.hero.state.worldX = column;
          game.hero.state.worldY = row;
        } else {
          data[pos] = 'M';
        }
      }
    },

    render() {
      const { columns, rows, data } = game.map;
      const { length } = data;
      for (let i = 0; i < length; i++) {
        const column = Math.floor(i % columns);
        const row = Math.floor(i / columns);
        const id = game.map.data[column + row * game.map.columns];
        if (id === '#') {
          game.ui.penColor = '#161';
          game.ui.drawPixel(column, row);
        } else if (id === 'H') {
          game.ui.penColor = '#0F0';
          game.ui.drawPixel(column, row);
        } else if (id === 'M') {
          game.ui.penColor = '#700';
          game.ui.drawPixel(column, row);
        }
      }
      // console.log(
      //   data
      //     .join('')
      //     .match(/.{1,30}/g)
      //     .join('\n')
      // );
    }
  },

  async main() {
    await game.setup();
    await game.render();
  },

  async setup() {
    game.ui.create();

    window.addEventListener('keydown', game.onKeyDown, false);

    game.ui.canvas.addEventListener(
      'click',
      async () => {
        if (game.state.gameOver) {
          if (game.state.title) {
            setTimeout(async () => {
              game.state.title = false;
              game.playBGM('dungeon');
              await game.onGameStart();
            }, 100);
          } else {
            game.stopBGM();
            game.playBGM('title');
            game.state.title = true;
            game.render();
          }
        } else {
          // await game.onGameOver();
        }
      },
      false
    );

    game.map.setup();
  },

  async render() {
    if (game.state.title) {
      game.ui.update(() => {
        game.ui.ctx.fillStyle = 'rgba(0, 68, 0, 0.6)';
        game.ui.ctx.fillRect(0, 0, game.ui.canvas.width, game.ui.canvas.height);

        game.ui.ctx.font = '64px fantasy';
        game.ui.ctx.fillStyle = '#900';
        game.ui.ctx.textAlign = 'center';
        game.ui.ctx.textBaseline = 'middle';
        game.ui.ctx.strokeStyle = '#fc0';
        game.ui.ctx.lineWidth = 6;
        game.ui.ctx.strokeText(
          'Roguelike Adventure',
          game.ui.canvas.width * 0.5,
          game.ui.canvas.height * 0.35
        );
        game.ui.ctx.fillText(
          'Roguelike Adventure',
          game.ui.canvas.width * 0.5,
          game.ui.canvas.height * 0.35
        );

        game.ui.ctx.font = '14px fantasy';
        game.ui.ctx.fillStyle = '#ccc';
        game.ui.ctx.textAlign = 'center';
        game.ui.ctx.textBaseline = 'middle';
        game.ui.ctx.fillText(
          'Created by Richard Marks',
          game.ui.canvas.width * 0.75,
          game.ui.canvas.height * 0.5
        );

        game.ui.ctx.font = '24px fantasy';
        game.ui.ctx.fillStyle = '#ccc';
        game.ui.ctx.textAlign = 'center';
        game.ui.ctx.textBaseline = 'middle';
        game.ui.ctx.fillText(
          'Click to Play',
          game.ui.canvas.width * 0.5,
          game.ui.canvas.height * 0.75
        );

        game.ui.ctx.font = '18px fantasy';
        game.ui.ctx.fillText(
          `Press M to ${game.options.state.music ? 'disable' : 'enable'} music`,
          game.ui.canvas.width * 0.5,
          game.ui.canvas.height * 0.95
        );

        game.ui.ctx.fillText(
          `Press S to ${game.options.state.sound ? 'disable' : 'enable'} sound`,
          game.ui.canvas.width * 0.5,
          game.ui.canvas.height * 0.89
        );

        game.highscore.score > 0 &&
          (() => {
            game.ui.ctx.textAlign = 'left';
            game.ui.ctx.fillText(`High Score: ${game.highscore.score}`, 10, 18);
          })();
      });
      return;
    }

    game.ui.update(() => {
      game.map.render();
      if (game.state.gameOver) {
        const hudX = game.ui.pixelWidth * game.map.columns;
        game.ui.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        game.ui.ctx.fillRect(0, 0, game.ui.canvas.width, game.ui.canvas.height);

        game.ui.ctx.font = '64px fantasy';
        game.ui.ctx.fillStyle = '#900';
        game.ui.ctx.textAlign = 'center';
        game.ui.ctx.textBaseline = 'middle';
        game.ui.ctx.fillText(
          'You Are Dead',
          hudX * 0.5,
          game.ui.canvas.height * 0.35
        );

        game.ui.ctx.font = '24px fantasy';
        game.ui.ctx.fillStyle = '#ccc';
        game.ui.ctx.textAlign = 'center';
        game.ui.ctx.textBaseline = 'middle';
        game.ui.ctx.fillText(
          'Click to Restart',
          hudX * 0.5,
          game.ui.canvas.height * 0.75
        );
        game.hud.render();
      } else {
        game.hud.render();
      }
    });
  },

  async onKeyDown({ key }) {
    if (game.state.gameOver) {
      if (game.state.title) {
        if (key === 'm' || key === 'M') {
          game.options.enableMusic = !game.options.state.music;
          if (!game.options.state.music) {
            game.stopBGM(true);
          } else {
            game.playBGM('title');
          }
          game.render();
        }
      }
      return;
    }
    // console.log({ key });
    const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (arrowKeys.includes(key)) {
      // move hero
      const fn = game[`moveHero${key.replace('Arrow', '')}`];
      typeof fn === 'function' && (await fn());
      await game.updateMonsters();
      await game.checkCondition();
      await game.render();
    } else if (key === 'Escape') {
      game.stopBGM();
      game.playBGM('title');
      game.state.gameOver = true;
      game.state.title = true;
      game.render();
    } else if (key === ' ') {
      await game.updateMonsters();
      await game.checkCondition();
      await game.render();
    }
  },

  async checkCondition() {
    if (game.hero.state.health > 0) {
      return;
    }
    await game.onGameOver();
  },

  async updateMonsters() {
    // console.log('updating monsters');

    let monsterCount = 0;
    let enemyDir = -1;

    const { rows, columns, data } = game.map;

    const { length } = data;

    const heroX = game.hero.state.worldX;
    const heroY = game.hero.state.worldY;

    const moveMonster = (column, row) => {
      const dx = ((enemyDir + 1) % 2) * (enemyDir - 1);
      const dy = (enemyDir % 2) * (2 - enemyDir);

      let nextX = column + dx;
      let nextY = row + dy;

      nextX = nextX < 0 ? 0 : nextX >= columns ? columns - 1 : nextX;
      nextY = nextY < 0 ? 0 : nextY >= rows ? rows - 1 : nextY;

      const curPos = column + row * columns;
      const pos = nextX + nextY * columns;

      if (pos < 0 || pos >= data.length) {
        return false;
      }

      const id = data[pos];

      if (id === undefined) {
        // should not be possible with the previous check...
        return false;
      }

      if (id === '#') {
        // cannot walk through walls
        return false;
      }

      if (id === '.') {
        data[curPos] = '.';
        if (enemyDir === 1 || enemyDir === 2) {
          data[pos] = 'F';
        } else {
          data[pos] = 'M';
        }
        return true;
      }

      return false;
    };

    const nextDirection = (column, row) => {
      let search = 10;
      do {
        search--;
        enemyDir = Math.floor(Math.random() * 4);
      } while (!moveMonster(column, row, enemyDir) && search > 0);
    };

    const damageHero = () => {
      game.playSound('monster attack');
      if (game.cheats.god) {
        return;
      }
      const dmg = Math.floor(Math.random() * 12) + 2;
      game.hero.state.health =
        game.hero.state.health - dmg < 0 ? 0 : game.hero.state.health - dmg;
    };

    for (let i = 0; i < length; i++) {
      const column = Math.floor(i % columns);
      const row = Math.floor(i / columns);
      const pos = column + row * columns;
      const id = data[pos];

      if (id === 'M') {
        monsterCount++;
        const yDist = Math.abs(row - heroY);
        const xDist = Math.abs(column - heroX);
        const dist = yDist + xDist;
        if (dist === 1) {
          // console.log('monster hurt player');
          damageHero();
        } else {
          if (dist < game.state.enemyRange) {
            // monster will move towards player
            if (yDist > xDist) {
              enemyDir = row > heroY ? 3 : 1;
            } else {
              enemyDir = column > heroX ? 0 : 2;
            }
          }
          if (enemyDir === -1 || !moveMonster(column, row)) {
            nextDirection(column, row);
          }
        }
      } else if (id === 'F') {
        data[pos] = 'M';
      }
    }

    if (monsterCount === 0) {
      game.state.level++;
      game.state.monsters += 2 * game.state.level;
      game.state.kills = 0;
      game.map.setup();
    }
  },

  async moveHeroByDelta(dx, dy) {
    const { rows, columns, data } = game.map;
    let hx = game.hero.state.worldX;
    let hy = game.hero.state.worldY;

    let nextX = hx + dx;
    let nextY = hy + dy;

    nextX = nextX < 0 ? 0 : nextX >= columns ? columns - 1 : nextX;
    nextY = nextY < 0 ? 0 : nextY >= rows ? rows - 1 : nextY;

    const curPos = hx + hy * columns;
    const pos = nextX + nextY * columns;

    if (pos < 0 || pos >= data.length) {
      // console.log('outside map', dx, dy);
      return;
    }

    const id = data[pos];

    if (id === undefined) {
      // should not be possible with the previous check...
      console.log('should not be possible');
      return;
    }

    if (id === '#') {
      // cannot walk through walls
      // console.log('wall in direction', dx, dy);
      return;
    }

    if (id === '.') {
      // update hero position

      // put an empty space where the hero was
      data[curPos] = '.';

      // move the hero
      data[pos] = 'H';
      game.hero.state.worldX = nextX;
      game.hero.state.worldY = nextY;
      // console.log('hero moved', dx, dy);
      game.playSound('footstep');
    } else if (id === 'M') {
      // next space is a monster
      data[pos] = '.';
      game.state.kills++;
      game.state.score += 5 * game.state.level;
      game.playSound('monster death');
      // console.log('monster killed by hero');
      const r = Math.random() * 100;
      if (r > 50) {
        console.log('item drop chance', r);
      }
    }
  },

  async moveHeroUp() {
    await game.moveHeroByDelta(0, -1);
  },

  async moveHeroDown() {
    await game.moveHeroByDelta(0, 1);
  },

  async moveHeroLeft() {
    await game.moveHeroByDelta(-1, 0);
  },

  async moveHeroRight() {
    await game.moveHeroByDelta(1, 0);
  },

  async onGameStart() {
    game.state.gameOver = false;
    game.state.score = 0;
    game.hero.state.maxHealth = 100;
    game.hero.state.health = 100;
    game.state.level = 1;
    game.state.kills = 0;
    game.map.setup();
    await game.render();
  },

  async onGameOver() {
    game.state.gameOver = true;
    game.highscore.save(game.state.score);
    game.stopBGM();
    game.playSound('gameover');
    await game.render();
  },

  bgm: null,
  snd: null,
  playBGM(music = 'dungeon') {
    if (!game.options.state.music) {
      game.bgm = null;
      return;
    }
    if (!game.bgm) {
      game.bgm = new beepbox.Synth();
    }
    if (game.bgm.isPlayingSong) {
      game.bgm.pause();
    }
    if (music === 'title') {
      game.bgm.setSong(
        '8n63s0k0l00e02t1Dm3a7g02j07i0r1o131444000T5v1L4ug6q1d2f7y0ziC1c3h2H0f810000000000T5v1L4u20q1d5f5y1z8C0c0h8H_SRJ6JIBxAAAAkT5v1L4u50q1d5f8y1z6C1c0h0H-JJAArrqiih999T1v1L4u30q1d5f9y1z7C1c0A9F4B0V1Q19e4Pb631E0067T6v3L4u77q1d1f7y4z1C1c2W79T1v1L4u3bq1d5f7y1z7C0c2AcF8B4V6Q047cPa744E0000T4v1L4uf0q1z6666ji8k8k3jSBKSJJAArriiiiii07JCABrzrrrrrrr00YrkqHrsrrrrjr005zrAqzrjzrrqr1jRjrqGGrrzsrsA099ijrABJJJIAzrrtirqrqjqixzsrAjrqjiqaqqysttAJqjikikrizrHtBJJAzArzrIsRCITKSS099ijrAJS____Qg99habbCAYrDzh00T3v1L4uf5q1d5f7y1z6C1S1jsSIzsSrIAASJJT2v1L4u15q0d1f8y0z1C2w0b00008y004i4x014h00p26eFJv9mrnQuJVdHWg2PnwZQ1Slm79V8VlJ7nd6jJAqqcJCzbHe8YGyeGqF8WVHCKsySCzVFJGGKHHHLIIIjpvwaqfiy6C9arqrGqWoBFJFJQAs7agp7mhQ4t17ghQ4tcL0JEJ8Iebib22QyT2QyS2QyS2QyS2QyS2wFH-i-1e_QBYAt_HbU4LGbWi_ljnnnjlm5dQ-ACWsDwunNfaRDjQOZllllgtBltBEJltwKrjnY9BVGHJPrHIWWWX9jnBuGVVpEYFpXuAJjh_VTpS9I6vCXq7uMVStStz2LwfcSafsQuQTh7L4tp7KVrKXtrKAOucCESEhwkTEVRdQV504Lja0BdhNdEJ0GqY1bM5cFB551NZ5555pNehFAbrrHGrzN712O8J9Nd5d8J1N80'
      );
    } else if (music === 'dungeon') {
      game.bgm.setSong(
        '8n63s0k0l00e0ft1Dm3a7g0fj07i0r1o131444000T5v1L4ug6q1d2f7y0ziC1c3h2H0f810000000000T5v1L4u20q1d5f5y1z8C0c0h8H_SRJ6JIBxAAAAkT5v1L4u50q1d5f8y1z6C1c0h0H-JJAArrqiih999T1v1L4u30q1d5f9y1z7C1c0A9F4B0V1Q19e4Pb631E0067T6v3L4u77q1d1f7y4z1C1c2W79T0v1L4u00q1d1f7y1z7C1w2c0h2T4v1L4uf0q1z6666ji8k8k3jSBKSJJAArriiiiii07JCABrzrrrrrrr00YrkqHrsrrrrjr005zrAqzrjzrrqr1jRjrqGGrrzsrsA099ijrABJJJIAzrrtirqrqjqixzsrAjrqjiqaqqysttAJqjikikrizrHtBJJAzArzrIsRCITKSS099ijrAJS____Qg99habbCAYrDzh00T3v1L4uf5q1d5f7y1z6C1S1jsSIzsSrIAASJJT2v1L4u15q0d1f8y0z1C2w0b004g4g0h40000h0h8N8M038h4x4h4z4z040g4z8i4000000idmhM0000014h4h004h4i4h4h4h8h4h0h4h4h010g410i4100p25sFJv9mrnQuJVdHWg2PnwZQ1Slm79V8VlJ7nd6jJAqqcJCzbHe8YGyeGqF8WVHCKsySCzVFJGGKHHHLIIIjpvwaqfiy6C9arqrGqWoBFJFJQAt17ghQ4t17ghQ4t17jbMbkbibubib2yQyMwJ8JwJ8JwJ8JwJ8JwEaq_ALwjLZ9v97vWO-1bWy-ALRkRRRQRlxjtfF9KD9U7BYjOJpQZcLllllk7plnpqblnobCQR_2puqGXsSWXeKKKOkRVnGKukQukSilJtsDpnnpnnnt0warQsWCWsyw2nFB0iCEUCQmwldu0BU2CkOyywU-yyyyIUD8QO5JJRRdNUzwxp4mAUCyCAmwUA0'
      );
    }
    game.bgm.playhead = 0;
    game.bgm.play();
  },
  stopBGM(force = false) {
    if (!force && !game.options.state.music) {
      return;
    }
    if (game.bgm) {
      if (game.bgm.isPlayingSong) {
        game.bgm.pause();
      }
    }
  },

  playSound(sound) {
    if (!game.options.state.sound) {
      game.snd = null;
      return;
    }
    if (!game.snd) {
      game.snd = new beepbox.Synth();
    }
    if (game.snd.isPlayingSong) {
      game.snd.pause();
    }
    if (sound === 'footstep') {
      game.snd.setSong(
        '8n12s0k0l00e00t43m2a3g00j07i0r1o000T6v0L4ugdq1d4f7y4z1C0c4W0hT2v0L4u02q2d4f8y0z1C2w0T3v1L4uf9q1d5f6y1z6C1SW86bmhkrrzrkrrrb4gp1j0aLkhBgapkOyAywL000'
      );
    } else if (sound === 'monster death') {
      game.snd.setSong(
        '8n12s0k0l00e00t43m2a3g00j07i0r1o000T6v0L4ugdq1d4f7y4z1C0c4W0hT2v0L4u02q2d4f8y0z1C2w1T3v1L4uf9q1d5f6y1z6C1SW86bmhkrrzrkrrrb4gp1e0bHBZeUY2WQw00'
      );
    } else if (sound === 'monster attack') {
      game.snd.setSong(
        '8n12s0k0l00e00t43m2a3g00j07i0r1o000T6v0L4ugdq1d4f7y4z1C0c4W0hT2v0L4u02q2d4f8y0z1C2w4T3v1L4uf9q1d5f6y1z6C1SW86bmhkrrzrkrrrb4gp1i0bjQVi40RdjB8ds000'
      );
    } else if (sound === 'gameover') {
      game.snd.setSong(
        '8n12s3k3l00e01t43m2a3g01j07i0r1o200T1v0L4uc7q1d4f6y1z1C0c0A6F1B2V1Q5209Pca84E0021T4v0L4uf0q1z6666ji8k8k3jSBKSJJAArriiiiii07JCABrzrrrrrrr00YrkqHrsrrrrjr005zrAqzrjzrrqr1jRjrqGGrrzsrsA099ijrABJJJIAzrrtirqrqjqixzsrAjrqjiqaqqysttAJqjikikrizrHtBJJAzArzrIsRCITKSS099ijrAJS____Qg99habbCAYrDzh00T2v1L4u15q0d1f8y0z1C2w0b4w40p1BIQudqqfKjArpddvEkT7A5U5du8kknwavFMbM0'
      );
    }
    game.snd.loopRepeatCount = 0;
    game.snd.playhead = 0;
    game.snd.play();
  }
};

async function boot() {
  await game.highscore.load();
  await game.options.load();
  game.playBGM('title');
  await game.main();
  window.game = game;
}

window.addEventListener('DOMContentLoaded', boot, false);
