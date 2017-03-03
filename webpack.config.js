const path = require('path');
const webpack = require('webpack');

module.exports = {
	devtool: 'inline-source-map',
	entry: [
		'react-hot-loader/patch',
		'webpack-dev-server/client?http://localhost:3000',
		'webpack/hot/only-dev-server',
		'./src/index'
	],
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'bundle.js',
		publicPath: '/static/'
	},
	plugins: [
		new webpack.optimize.OccurrenceOrderPlugin(),
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NamedModulesPlugin(),
		new webpack.NoEmitOnErrorsPlugin()
	],
	module: {
		rules: [{
			test: /\.jsx?$/,
			use: ['babel-loader'],
			exclude: /node_modules/
		}]
	},
	devServer: {
		host: 'localhost',
		port: 3000,
		historyApiFallback: true,
		hot: true
	}
};
