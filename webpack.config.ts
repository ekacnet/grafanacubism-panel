import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig from './.config/webpack/webpack.config';

const config = async (env: any): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);
  const customConfig: Configuration = {
    module: {
      rules: [
        {
          test: /\.js$/,
          enforce: 'pre',
          use: ['source-map-loader'],
        },
      ],
    },
    // `mode` is inherited from grafanaConfig(env), which sets it to
    // 'production' when env.production is true. Do not override it here.
  };
  return merge(baseConfig, customConfig);
};

export default config;
