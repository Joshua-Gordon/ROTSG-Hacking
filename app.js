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

/*
This is the entry point for new clients. It sends the entire world state
to them, and then opens the connection to swap delta-compressed worlds and
merge updates
*/
app.get("/connect",function(req,res) {
    //DEBUG VERSION WITH TEST WORLD
    var worldstring = World.toWorldString(testworld);
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

app.post("/tick", function(req,res) {
    console.log(req.body);
    res.send(JSON.stringify({})); //temporary
})

app.listen(8000, () => console.log("Running on port 8000!"));