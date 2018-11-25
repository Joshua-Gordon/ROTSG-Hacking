

interface Player {
    sprite : string;
    x : number;
    y : number;
}

class World {
    timestamp : number;
    tiles : string[][];
    players : Player[];

    constructor() {
        this.timestamp = new Date().getMilliseconds();
        this.tiles = [] as string[][];
        this.players = [] as Player[];
    }
}

module.exports = {
    "toWorldString" : toWorldString,
    "World" : World
}

/*
Turns a world into a string that can be sent to a newly connected client
Form is:
numberOfTiles,tile,tile,tile...,numberOfPlayers,player,player,player...,
                worldsizeX,worldsizeY,(0:0),(0:1),(0:2)...(x:y)
*/
function toWorldString(world : World) : string {
    var output = ""; //string to contain the world
    var worldSizeX = world.tiles.length;
    var worldSizeY = world.tiles[0].length;
    var uniqueTiles = [] as string[]; //compute all unique tiles for loading
    for(var x = 0; x < worldSizeX; ++x) { 
        for(var y = 0; y < worldSizeY; ++y) {
            var tile = world.tiles[x][y];
            if(uniqueTiles.indexOf(tile) == -1) { //check if tile has not been seen before
                uniqueTiles.push(tile);
            }
        }
    }
    output += uniqueTiles.length + ",";
    for(var i = 0; i < uniqueTiles.length; ++i) {
        output += uniqueTiles[i] + ","
    }
    var numberOfPlayers = world.players.length;
    output += numberOfPlayers + ",";
    for(var i = 0; i < numberOfPlayers; ++i) {
        output += world.players[i].sprite + ",";
        output += world.players[i].x + ",";
        output += world.players[i].y + ",";
    }
    output += worldSizeX + ",";
    output += worldSizeY + ",";
    for(var x = 0; x < worldSizeX; ++x) { 
        for(var y = 0; y < worldSizeY; ++y) {
            output += world.tiles[x][y] + ","
        }
    }
    return output;
}