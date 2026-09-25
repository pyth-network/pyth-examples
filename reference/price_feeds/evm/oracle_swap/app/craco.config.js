module.exports = {
    webpack: {
      configure: (config) => {
        // ...
        const fileLoaderRule = getFileLoaderRule(config.module.rules);
        if (!fileLoaderRule) {
          throw new Error("File loader not found");
        }
        fileLoaderRule.exclude.push(/\.cjs$/);
        // ...
        return config;
      },
      ignoreWarnings: [
        function ignoreSourcemapsloaderWarnings(warning) {
          return (
            warning.module &&
            warning.module.resource.includes('node_modules') &&
            warning.details &&
            warning.details.includes('source-map-loader')
          )
        },
      ],
    },
    eslint: null,
  };
  
  function getFileLoaderRule(rules) {
    for (const rule of rules) {
      if ("oneOf" in rule) {
        const found = getFileLoaderRule(rule.oneOf);
        if (found) {
          return found;
        }
      } else if (rule.test === undefined && rule.type === "asset/resource") {
        return rule;
      }
    }
  }