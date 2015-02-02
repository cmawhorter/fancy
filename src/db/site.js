
function Site() {
  this.pages = {};
}

Site.prototype.addPage = function(relative, properties, locale) {
  this.pages[relative] = this.pages[relative] || []
};

module.exports = Site;
