var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var ArticleSchema = new Schema({
	title: {
    type: String,
    required: true
  },
  img: {
  	type: String,
  	required: false,
    default: "http://via.placeholder.com/150?text=No%20Image"
  },
  link: {
  	type: String,
  	required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  comment: {
    type: Schema.Types.Mixed,
    ref: "Comment"
  }
})

var Article = mongoose.model("Article", ArticleSchema);

module.exports = Article;