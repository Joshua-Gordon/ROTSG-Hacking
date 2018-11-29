var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
window.onload = startUp;
let gamepadAPI = {
    controller: {},
    connect: function (e) {
        gamepadAPI.controller = e.gamepad;
        console.log('Gamepad connected.');
    },
    disconnect: function (e) {
        delete gamepadAPI.controller;
        console.log('Gamepad disconnected.');
    },
    update: function () {
        // clear the buttons cache
        gamepadAPI.buttonsCache = [];
        // move the buttons status from previous fram to the cache
        for (let i = 0; i < gamepadAPI.buttonsStatus.length; i++) {
            gamepadAPI.buttonsCache[i] = gamepadAPI.buttonsStatus[i];
        }
        // clear the buttons status
        gamepadAPI.buttonsStatus = [];
        // get the gamepad object
        let gp = navigator.getGamepads()[0] || { buttons: [], axes: [] };
        // loop through buttons and push the pressed ones to the array
        let pressed = [];
        if (gp.buttons) {
            let k = gp.buttons.length;
            for (let i = 0; i < k; i++) {
                if (gp.buttons[i].pressed) {
                    pressed.push(gamepadAPI.buttons[i]);
                }
            }
        }
        // loop through axes and push their values to the array
        let axes = [];
        if (gp.axes) {
            let k = gp.axes.length;
            for (let i = 0; i < k; i++) {
                axes.push(gp.axes[i].toFixed(2));
            }
        }
        // assign received values
        gamepadAPI.axesStatus = axes;
        gamepadAPI.buttonsStatus = pressed;
        // return buttons for debugging purposes
        return pressed;
    },
    buttonPressed: function (button, hold) {
        let newPress = false;
        // loop through pressed buttons
        let k = gamepadAPI.buttonsStatus.length;
        for (let i = 0; i < k; i++) {
            // if we found the button we're looking for...
            if (gamepadAPI.buttonsStatus[i] === button) {
                // set the boolean variable to true
                newPress = true;
                // if we want to check the single press
                if (!hold) {
                    // loop through the cached states from the precious frame
                    k = gamepadAPI.buttonsCache.length;
                    for (let i = 0; i < k; i++) {
                        // if the button was alread pressed, ignore new press
                        if (gamepadAPI.buttonsCache[i] === button) {
                            newPress = false;
                        }
                    }
                }
            }
        }
        return newPress;
    },
    buttons: [
        'DPad-Up', 'DPad-Down', 'DPad-Left', 'DPad-Right',
        'Start', 'Back', 'Axis-Left', 'Axis-Right',
        'LB', 'RB', 'Power', 'A', 'B', 'X', 'Y'
    ],
    buttonsCache: [],
    buttonsStatus: [],
    axesStatus: []
};
window.addEventListener('gamepadconnected', gamepadAPI.connect);
window.addEventListener('gamepaddisconnected', gamepadAPI.disconnect);
let canvas;
/*
This object contains all the images used in the current world.
Each asset we draw will have to have a number with the world it is associated with.
If you can think of a better way to do this, I am willing to steamroll this
pile of hot garbage of an idea.
*/
let assets = {};
// this really should be a Map, but typescript does not support ES6 Maps as of the writing of this comment
let player = {}; // the user's player
let gameWorld = {}; // the world to draw
let dWorld = {}; // the local changes the user makes to the global world each tick
/*
This function is called as window.onload
Its purpose is to connect to the server for the first time and begin the process of
retrieving the initial world state.
*/
function startUp() {
    canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    console.log('Starting up!');
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            const data = xhr.responseText;
            loadAssets(data); // The response text should be of the form:
            /*
            player, numberOfTiles,tile,tile,tile...,numberOfPlayers,player,player,player...,
                worldsizeX,worldsizeY,(0:0),(0:1),(0:2)...(x:y)
            the first player is the user
            tiles are filenames that can be used to retrieve base64 encoded images from the server
            players are a filename representing a base64 encoded image, followed by an x and a y
            worldsizeX and worldsizeY are what they say they are
            the coordinates are all filenames referring to tiles
            the coordinates are not comma separated because that would be confusing to the reader
            */
        }
        // possible optimization: use numbers for the images instead of their filenames
    };
    xhr.open('GET', '/connect');
    xhr.send(null);
}
function loadAssets(data) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log(data)
        const components = data.split(',');
        // grab user player
        const userlist = [components.shift(), components.shift(), components.shift()];
        yield loadUser(userlist);
        // tiles are up first
        const numberOfTiles = +components.shift(); // pop the number of tiles off of the data string
        const tilelist = [];
        for (let i = 0; i < numberOfTiles; ++i) {
            tilelist.push(components.shift());
        }
        yield loadTiles(tilelist);
        // tiles are done, now for players
        const numberOfPlayers = +components.shift();
        const playerlist = [];
        for (let i = 0; i < numberOfPlayers * 3; ++i) {
            playerlist.push(components.shift());
        }
        yield loadPlayers(playerlist);
        // At this point, we need to create the World object
        // and begin populating it with players
        const world = new World();
        // Players are done. Now for the layout of the world.
        // This part does not actually need to block, as only the names are referenced, not values that are possibly unloaded
        const worldSizeX = +components.shift();
        const worldSizeY = +components.shift();
        let tempColumn; // Need space to put tiles before loading onto columns of world
        for (let x = 0; x < worldSizeX; ++x) { // Loading goes down columns, starting from left and going right
            tempColumn = [];
            for (let y = 0; y < worldSizeY; ++y) {
                const tilename = components.shift();
                tempColumn.push(tilename);
            }
            world.tiles.push(tempColumn);
        }
        console.log('All assets loaded!');
        gameLoop(world);
    });
}
/*
This is where the action happens. The game is in motion, and the player is modifying the shared world.
Loop because javascript doesn't have tco :(
*/
function gameLoop(world) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log(assets)
        // Javascript is pass by copy of reference for objects, so no sneaky pointers with the
        // handle input function. We have to use the global variable.
        document.addEventListener('keydown', handleUserInput, false);
        gameWorld = world;
        while (true) {
            let buttonsPressed = gamepadAPI.update();
            handleControllerInput(buttonsPressed);
            // player input is handled asynchronously
            yield new Promise(function (resolve, reject) {
                // send local world changes to server
                const xhr = new XMLHttpRequest();
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        // get world changes back from server
                        // apply server changes
                        const realDelta = JSON.parse(xhr.responseText);
                        applyChanges(realDelta);
                    }
                };
                xhr.onload = resolve;
                dWorld['timestamp'] = new Date().getTime();
                xhr.open('GET', '/tick?data=' + JSON.stringify(dWorld));
                xhr.setRequestHeader('Content-Type', 'application/json');
                // console.log('dworld: ' + JSON.stringify(dWorld))
                xhr.send();
                // console.log('Sent tick request')
                setTimeout(reject, 20 * 1000);
            });
            // draw
            drawWorld(gameWorld);
            // console.log('Draw world')
        }
    });
}
let TILE_SIZE = 64;
let SIGHT_RADIUS = 15;
function drawWorld(world) {
    const ctx = canvas.getContext('2d');
    // get player location, and draw tiles within sight radius (L-infinity) around it
    const centerx = Math.round(player.x / TILE_SIZE);
    const centery = Math.round(player.y / TILE_SIZE);
    /*
    Player coordinates are given in pixels, whereas tile coordinates are on the tile grid
    Tile 2 from the left starts at player x 2*tileSize, where tileSize is currently 64
    */
    for (let x = centerx - SIGHT_RADIUS; x < centerx + SIGHT_RADIUS; ++x) { // draw tiles in sight radius
        for (let y = centery - SIGHT_RADIUS; y < centery + SIGHT_RADIUS; ++y) {
            if (x >= 0 && x < world.tiles.length && y >= 0 && y < world.tiles[0].length) { // if tile is in bounds
                const tileIm = assets[world.tiles[x][y]]; // get tile from asset object
                ctx.drawImage(tileIm, x * TILE_SIZE, y * TILE_SIZE); // draw tile image to canvas
                // DEBUG CODE
                // document.body.appendChild(tileIm);
                // END DEBUG CODE
                // God dang I want preprocessor directives
            }
        }
    }
    // draw user
    ctx.drawImage(assets[player.sprite], player.x, player.y);
    // draw all other players
    for (let i = 0; i < world.players.length; ++i) {
        const p = world.players[i];
        if (Math.abs(p.x - centerx) < SIGHT_RADIUS * TILE_SIZE && Math.abs(p.y - centery) < SIGHT_RADIUS * TILE_SIZE) {
            ctx.drawImage(assets[p.sprite], p.x, p.y);
        }
    }
}
let MOVE_SPEED = 1;
function handleControllerInput(keyPresses) {
    const buttonPressed = keyPresses[0] || '';
    console.log(buttonPressed);
    if (buttonPressed === 'Axis-Left') {
        dWorld[player.sprite + '-x'] -= 1;
        player.x -= MOVE_SPEED;
    }
    if (buttonPressed === 'Axis-Right') {
        dWorld[player.sprite + '-x'] += 1;
        player.x += MOVE_SPEED;
    }
}
let PLAYER_SPEED = 10;
function handleUserInput(keyEvent) {
    keyEvent.preventDefault();
    const key = keyEvent.key;
    if (key === 'ArrowUp') {
        dWorld[player.sprite + '-y'] -= 1;
        player.y -= PLAYER_SPEED;
    }
    if (key === 'ArrowDown') {
        dWorld[player.sprite + '-y'] += 1;
        player.y += PLAYER_SPEED;
    }
    if (key === 'ArrowLeft') {
        dWorld[player.sprite + '-x'] -= 1;
        player.x -= PLAYER_SPEED;
    }
    if (key === 'ArrowRight') {
        dWorld[player.sprite + '-x'] += 1;
        player.x += PLAYER_SPEED;
    }
}
function applyChanges(changes) {
    /*
    Changes is an object with a field for each object that could be changed, referenced by it's
    name. In the future, use numeric IDs for all changeable things in the game

    Currently, changes contains x and y updates for all players
    */
    /*
     for(var i = 0; i < gameWorld.players.length; ++i) {
         var sprite = gameWorld.players[i].sprite;
         if(changes.hasOwnProperty(sprite)) {
             gameWorld.players[i].x += changes[sprite].x;
             gameWorld.players[i].y += changes[sprite].y;
         }
     }
     */
    for (const key in Object.keys(changes)) {
        if (gameWorld[key]) {
            gameWorld[key] += changes[key];
        }
        else {
            gameWorld[key] = changes[key];
        }
    }
}
function loadUser(userlist) {
    return __awaiter(this, void 0, void 0, function* () {
        const fname = userlist[0];
        const x = userlist[1];
        const y = userlist[2];
        player.sprite = fname;
        player.x = +x;
        player.y = +y;
        return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    const data = xhr.responseText; // this is a base64 encoded string
                    const im = new Image();
                    im.src = 'data:image/png;base64,' + data; // build the user sprite image
                    assets[fname] = im; // add the sprite to the assets object
                }
            };
            xhr.onload = resolve;
            xhr.open('GET', '/assets/' + fname);
            xhr.send(null);
        });
    });
}
function loadTiles(tilenames) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log('Tilenames: ' + tilenames)
        for (let i = 0; i < tilenames.length; ++i) {
            // console.log('Begin loop: ' + i)
            yield new Promise(function (resolve, reject) {
                const fname = tilenames[i]; // grab the next tile name
                const xhr = new XMLHttpRequest();
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        const data = xhr.responseText; // this is a base64 encoded string
                        const im = new Image();
                        im.src = 'data:image/png;base64,' + data; // build the tile image
                        assets[fname] = im; // add the tile to the assets object
                        // console.log('Loaded tile ' + fname)
                    }
                };
                xhr.onload = resolve;
                // console.log('Grabbing tile ' + fname)
                xhr.open('GET', '/assets/' + fname);
                xhr.send(null);
            });
            // console.log('Loop: ' + i)
        }
    });
}
function loadPlayers(playerslist) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log(playerslist)
        const players = [];
        const len = playerslist.length;
        for (let i = 0; i < len / 3; ++i) {
            yield new Promise(function (resolve, reject) {
                const fname = playerslist.shift();
                const x = +playerslist.shift();
                const y = +playerslist.shift();
                // The following block of code is copy+paste'd from above, with a comment change
                const xhr = new XMLHttpRequest();
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        const data = xhr.responseText; // this is a base64 encoded string
                        const im = new Image();
                        im.src = 'data:image/png;base64,' + data; // build the player sprite image
                        assets[fname] = im; // add the player sprite to the assets object
                        // console.log('Loaded sprite ' + fname)
                    }
                };
                xhr.onload = resolve;
                // console.log('Grabbing sprite ' + fname)
                xhr.open('GET', '/assets/' + fname);
                xhr.send(null);
                // end copy+paste
                // What you are referring to as paste is in fact copy/paste, or copy+paste as I've taken to calling it...
                const player = {};
                player.sprite = fname;
                player.x = x;
                player.y = y;
                players.push(player);
            });
        }
        gameWorld.players = players;
    });
}
