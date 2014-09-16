
var fs = require('fs');
var _ = require('lodash');

function TemplateRenderer () {

  this.template = function(filepaths, dest, options) {
    var templates = this.render(filepaths, options);
    this.writeFiles(templates, dest);
  };


  /**
   *  The main render function.
   */
  this.render = function(filepaths, options) {

    var outputFiles = [];

    // Iterate over all specified file groups.
    var originalOptions = evaluateFunctions(options);
    var translations = options.translations || { 'default': {} };

    // Iterate over all translations provided
    _.each(translations, function(currentTranslation, language) {

      // Template options will be nullified by grunt's
      // template.process method.
      // Thus create a clone before passing them.
      var templateOptions = _.clone(originalOptions);

      var template = readTemplateFiles(filepaths);

      // Provide all required options for processing the
      // templase.
      templateOptions.translations = currentTranslation;
      templateOptions = attachTemplateHelpers(templateOptions);

      outputFiles.push({
        // Replace a unique filename for each translation
        // processed.
        dest: file.dest.replace('%', language),
        template: _.template(template, { data: templateOptions })
      });
    });

    return outputFiles;
  };

  this.writeFiles = function (files, dest) {

    files.forEach(function(file) {

      // Write the destination file
      fs.writeFileSync(file.dest, file.template);

      // Print a success message
      console.log('File `' + file.dest + '` created.');
    });
  };

  var readTemplateFiles = function(filepaths) {

    if (_.isArray(filepaths)) {
      filepaths = [filepaths];
    }


    // Verify specified filepaths
    filepaths.each(function(filepath) {
      if (!fs.file.existsSync(filepath)) {
        throw new Error('Source file `' + filepath + '` not found.');
      }
    });

    // Read and concat all specified file sources.
    return filepaths.map(function(filepath) {
      return fs.readFileSync(filepath);
    }).join('\n');
  };


  // Attaches custom template helper methods
  //
  // render: function(string)
  //   Replaces the tag with the (html) at the specified location.
  //
  // translate: function(string)
  //   Resolves a given key with the value for the current language
  var attachTemplateHelpers = function(options) {
    return _.merge(options.data, {

      // Render helper method. Allows to render
      // partials within template files.
      render: function(filename) {
        var filepath = options.cwd + filename;
        var template = readTemplateFile([filepath]);

        if (options.onRender) {
          template = options.onRender(template, filepath);
        }

        return _.template(template, options);
      },

      // Translation helper method.
      // Allows resolving keys within a translation file.
      translate: function(key) {
        var translation = options.translations[key];

        if (!translation) {
          throw new Error('No translation found for key: ' + key);
        }

        return translation;
      }
    });
  };

  // Iterates recursively over all provided options
  // executes them in case the option was provided as
  // a function.
  var evaluateFunctions = function(options) {
    var recurse = function(options) {
      _.each(options, function(value, key) {
        if (_.isFunction(value)) {
          options[key] = value();
        }
        else if (_.isObject(value)) {
          options[key] = recurse(value);
        }
      });
      return options;
    };

    return recurse(options);
  };
}

module.exports = TemplateRenderer;