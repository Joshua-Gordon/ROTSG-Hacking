var fs = require("fs")

var Express = require('express')
var BodyParser = require('body-parser')
var Multer = require('multer')

var app = Express()
var upload = Multer()

var World = require("./static/world.js");
var testworld = require("./testWorld.json");

app.use(Express.static("static/"));

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({extended : true}));

function encode(fname) {
    var im = fs.readFileSync(fname);
    return new Buffer(im).toString("base64");
}


var gameworld = testworld;
/*
This is the entry point for new clients. It sends the entire world state
to them, and then opens the connection to swap delta-compressed worlds and
merge updates
*/
app.get("/connect",function(req,res) {
    //DEBUG VERSION WITH TEST WORLD
    var worldstring = World.toWorldString(gameworld);
    var playerString = "Sorceror0.png,0,0,";
    res.send(playerString+worldstring);
})

/*
This function allows clients to retrieve images from the server
through a GET request. Integral to the loadAssets() function
*/
app.get("/assets/:fname", function(req,res) {
    var fname = req.params.fname;
    res.send(encode("ims/"+fname))
    console.log("Send asset " + fname);
})

//Updates is a list containing the last 20 seconds of dworlds
var DSYNC_TIME = 20*1000;

var updates = []
app.get("/tick", function(req,res) {
    console.log("Request body for tick: ");
    console.log(req.query);
    var dworld = JSON.parse(req.query.data);
    merge(dworld);
    console.log("Changes merged.");
    var changesSince = getUpdates(dworld.timestamp);
    console.log("Updates acquired!");
    console.log("Change object:");
    console.log(changesSince);
    if(changesSince){
        res.send(JSON.stringify(changesSince));
        console.log("Changes sent");
    } else {
        res.status(504);
        console.log("Timeout!");
    }
})

function merge(dworld) {
    console.log("Merging changes!");
    for(var key in Object.keys(dworld)) {
        //Handle user motion
        var comps = key.split("-");
        var username = comps[0];
        for(var i = 0; i < gameworld.players.length; ++i) {
            if(gameworld.players[i].sprite === username) {
                gameworld.players[i][comps[1]] += dworld[key];
            }
        }
        //End handle user motion
    }
    updates.push(dworld);
    while(updates.length > 2 && new Date().getTime() - updates[updates.length-1].timestamp > DSYNC_TIME) {
        updates.pop();
        console.log("Forgetting about old change!");
    }
}

function getUpdates(timestamp) {
    console.log("Timestamp: " + timestamp);
    if(new Date().getTime() - timestamp > DSYNC_TIME) {
        console.log(new Date().getTime() - timestamp)
        return null;
    }
    var updateInstructions = {};
    for(var i = 0; updates[i].timestamp - timestamp > 0; ++i) {
        if(updateInstructions === {}) {
            updateInstructions = updates[0];
        } else {
            for(var key in Object.keys(updates[i])) {
                if(updateInstructions[key]) {
                    updateInstructions[key] += updates[i][key];
                } else {
                    updateInstructions[key] = updates[i][key];
                }
            }
        }
    }
    return updateInstructions;
}

app.listen(8000, () => console.log("Running on port 8000!"));