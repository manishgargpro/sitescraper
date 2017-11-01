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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/article_db');

var results = [];

app.get("/scrape", function(req, res) {
  request("https://www.reddit.com", function(error, response, html) {
    var $ = cheerio.load(html);
    db.Article.find({})
      .then(function(dbArticles) {
        var articles = dbArticles.slice(0);
        console.log(articles);
        $("div.thing").each(function(i, element) {
          var atitle = $(element).find("a.title").text();
          var aimgsrc = $(element).find("img").attr("src");
          var alink;
          if ($(element).attr("data-url").split("/")[0] === "r") {
            alink = "https://www.reddit.com" + $(element).attr("data-url");
          } else {
            alink = $(element).attr("data-url");
          }
          var newArticle = {
            title: atitle,
            img: aimgsrc,
            link: alink,
          };
          var found = false;
          articles.forEach(function(article) {
            if (article.title === newArticle.title) {
              found = true;
            }
          });
          if (found === false) {
            articles.push(newArticle);
          }
        })
        console.log(articles);
        return db.Article.create(articles);
      })
      .then(function(dbArticles) {
        console.log(dbArticles)
        res.json(dbArticles);
      })
      .catch(function(error) {
        console.log(error)
      })
  });
});

app.get("/", function(req, res) {
  db.Article
    .find({}, null, { sort: { createdAt: -1 } })
    .populate("comment")
    .then(function(dbArticle) {
      res.render("index", { articles: dbArticle });
    }).catch(function(error) {
      console.log(error);
      res.send(false);
    });
});

app.post("/comment/:articleId", function(req, res) {
  db.Comment
    .create(req.body)
    .then(function(dbComment) {
      return db.Article
        .findOneAndUpdate(
          { _id: req.params.articleId },
          { $push: { comment: dbComment._id } },
          { new: true }
        )
    }).then(function(dbArticle) {
      res.redirect("/");
    }).catch(function(error) {
      console.log(error);
      res.send(false);
    });
});

app.delete("/delete/:id", function(req, res) {
  db.Comment
    .remove({ _id: req.params.id })
    .then(function(dbComment) {
      return db.Article
        .findOneAndUpdate(
          {_id: req.body.id},
          { $pull: { comment: { _id: req.params.id } } },
          { new: true }
        )
    })
    .then(function(dbArticle) {
      res.json("/");
    }).catch(function(error) {
      console.log(error);
      res.send(false);
    });
});

app.listen(PORT, function() {
  console.log("Running on port " + PORT);
});