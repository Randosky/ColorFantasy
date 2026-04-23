const path = require("path");

module.exports = (env, argv) => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const watch = argv.watch || isDevelopment;

  return {
    mode: isDevelopment ? "development" : "production",
    watch,
    entry: {
      main: "./src/ColorFantasy.ts",
    },
    devtool: isDevelopment ? "eval-cheap-module-source-map" : false,
    output: {
      filename: "[name].bundle.js",
      path: path.resolve(__dirname, "dist"),
      chunkFilename: "[name].js",
    },
    resolve: {
      extensions: [".ts", ".js"],
      modules: [path.resolve(__dirname, "js"), "node_modules"],
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@components": path.resolve(__dirname, "src/components"),
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env", "@babel/preset-typescript"],
              plugins: [
                "transform-custom-element-classes",
                "@babel/plugin-proposal-class-properties",
                "@babel/plugin-syntax-dynamic-import",
              ],
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
          include: /\.css$/,
          exclude: /\.module\.css$/,
        },
      ],
    },
    plugins: [],
    optimization: {
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
        },
      },
      minimize: !isDevelopment,
    },
  };
};
