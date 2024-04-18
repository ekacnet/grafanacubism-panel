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
    mode: 'development',
  };
  return merge(baseConfig, customConfig);
};

export default config;
