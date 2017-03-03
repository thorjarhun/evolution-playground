const path = require('path');
const webpack = require('webpack');

module.exports = {
	devtool: 'source-map',
	entry: './src/index',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'static/bundle.js',
		publicPath: '/'
	},
	plugins: [
		new webpack.optimize.UglifyJsPlugin({
			sourceMap: true,
			comments: false
		})
	],
	module: {
		loaders: [{
			test: /\.jsx?$/,
			loaders: ['babel-loader'],
			exclude: /node_modules/
		}]
	}
};
