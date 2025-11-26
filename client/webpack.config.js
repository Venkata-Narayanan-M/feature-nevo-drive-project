import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default { 
  mode: 'development', 
  entry: './src/main.jsx', 
  output: {
    path: resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js', 
    clean: true, 
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html', 
      filename: 'index.html',
    }),
  ],
  devServer: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
        '/api': 'http://192.168.0.5:3001', // TODO - Update with acutal IP here
    },
    historyApiFallback: true,
  },
};