const config = {
  ...require('./app.json').expo,
  extra: {
    ...require('./app.json').expo.extra,
    eas: {
      projectId: "anonymous-development"
    }
  },
  owner: undefined,
  slug: "local-clubhouse-dev"
};

module.exports = config;
