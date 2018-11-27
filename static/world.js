class World {
    constructor() {
        this.timestamp = new Date().getMilliseconds();
        this.tiles = [];
        this.players = [];
    }
}
module.exports = {
    'toWorldString': toWorldString,
    'World': World
};
/*
Turns a world into a string that can be sent to a newly connected client
Form is:
numberOfTiles,tile,tile,tile...,numberOfPlayers,player,player,player...,
                worldsizeX,worldsizeY,(0:0),(0:1),(0:2)...(x:y)
*/
function toWorldString(world) {
    let output = ''; // string to contain the world
    let worldSizeX = world.tiles.length;
    let worldSizeY = world.tiles[0].length;
    let uniqueTiles = []; // compute all unique tiles for loading
    for (let x = 0; x < worldSizeX; ++x) {
        for (let y = 0; y < worldSizeY; ++y) {
            let tile = world.tiles[x][y];
            if (uniqueTiles.indexOf(tile) === -1) { // check if tile has not been seen before
                uniqueTiles.push(tile);
            }
        }
    }
    output += uniqueTiles.length + ',';
    for (let i = 0; i < uniqueTiles.length; ++i) {
        output += uniqueTiles[i] + ',';
    }
    let numberOfPlayers = world.players.length;
    output += numberOfPlayers + ',';
    for (let i = 0; i < numberOfPlayers; ++i) {
        output += world.players[i].sprite + ',';
        output += world.players[i].x + ',';
        output += world.players[i].y + ',';
    }
    output += worldSizeX + ',';
    output += worldSizeY + ',';
    for (let x = 0; x < worldSizeX; ++x) {
        for (let y = 0; y < worldSizeY; ++y) {
            output += world.tiles[x][y] + ',';
        }
    }
    return output;
}
