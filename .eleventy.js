const path = require("node:path");

module.exports = function(eleventyConfig) {
  eleventyConfig.ignores.add("./index.html");
  eleventyConfig.ignores.add("./feed.xml");
  eleventyConfig.ignores.add("./posts/**");
  eleventyConfig.ignores.add("./assets/posts/**/README.md");

  eleventyConfig.addPassthroughCopy({ "assets/posts": "assets/posts" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addShortcode("asset", function(assetPath) {
    const rawPath = String(assetPath).replace(/^\//, "");
    const pageUrl = (this.ctx.page && this.ctx.page.url) || "/";
    const pageDir = pageUrl.endsWith("/") ? pageUrl : path.posix.dirname(pageUrl) + "/";
    return path.posix.relative(pageDir, `/${rawPath}`) || ".";
  });
  eleventyConfig.addFilter("relativeUrl", function(targetUrl, pageUrl = "/") {
    const from = pageUrl.endsWith("/") ? pageUrl : path.posix.dirname(pageUrl) + "/";
    return path.posix.relative(from, targetUrl) || ".";
  });

  eleventyConfig.addCollection("post", function(collectionApi) {
    return collectionApi.getFilteredByGlob("./content/posts/*.md");
  });
  eleventyConfig.addFilter("displayDate", function(value) {
    const date = new Date(value);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  });

  return {
    dir: {
      input: ".",
      includes: "src/_includes",
      output: "_site"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
    passthroughFileCopy: true
  };
};
