var express = require("express");
var exhbs = require("express-handlebars");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var cheerio = require("cheerio");
var request = require("request");
var db = require("./models");

var app = express();
var PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

app.engine("handlebars", exhbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

mongoose.Promise = Promise;
mongoose.connect('mongodb://localhost/article_db');

var results = [];

app.get("/scrape", function (req, res) {
	request("https://www.reddit.com", function (error, response, html) {
		var $ = cheerio.load(html);
		$("div.thing").each(function (i, element) {
			var atitle = $(element).find("a.title").text();
			var aimgsrc = $(element).find("img").attr("src");
			var alink = $(element).attr("data-url");
			var newArticle = {
				title: atitle,
				img: aimgsrc,
				link: alink,
			};
			db.Article.find({ title: newArticle.title }).then(function (dbArticle) {
				if (!dbArticle.length) {
					db.Article.create(newArticle).then(function (dbArticle) {
						res.send("Success, reload the page");
						return;
					}).catch(function (error) {
						console.log(error);
						res.send(false);
					})
				} else {
					res.send("No new articles, reload the page");
					return;
				}
			}).catch(function (error) {
				console.log(error);
				res.send(false);
			});
		});
	});
});

app.get("/", function (req, res) {
	db.Article
		.find({})
		.populate("comment")
		.then(function (dbArticle) {
			// res.json(dbArticle);
			res.render("index", {articles: dbArticle.reverse()});
		}).catch(function (error) {
			console.log(error);
			res.send(false);
		});
});

app.post("/comment/:id", function (req, res) {
	db.Comment
		.create(req.body)
		.then(function(dbComment) {
			return db.Article
				.findOneAndUpdate(
					{_id: req.params.id},
					{$push: {comment: dbComment._id}},
					{new: true}
				)
		}).then(function (dbArticle) {
			res.redirect("/");
		}).catch(function (error) {
			console.log(error);
			res.send(false);
		});
});

app.delete("/delete/:id", function (req, res) {
	db.Comment
		.remove({_id: req.params.id})
		.then(function(dbComment) {
			res.redirect("/");
		}).catch(function (error) {
			console.log(error);
			res.send(false);
		});
});

app.listen(PORT, function() {
  console.log("Running on port " + PORT);
});