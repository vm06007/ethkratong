const path = require("path");
const PugPlugin = require("pug-plugin");

module.exports = {
  mode: "production",

  performance: {
    hints: false,
  },

  entry: {
    index: "./src/pug/index.pug",
    "conversational-ai": "./src/pug/conversational-ai/index.pug",
    integration: "./src/pug/integration/index.pug",
    "customizable-workflows": "./src/pug/customizable-workflows/index.pug",
    docs: "./src/pug/docs/index.pug",
    "sign-up": "./src/pug/sign-up/index.pug",
  },

  output: {
    path: path.join(__dirname, "dist"),
  },

  resolve: {
    alias: {
      // use alias to avoid relative paths like `./../../images/`
      Images: path.join(__dirname, "./src/images/"),
      Fonts: path.join(__dirname, "./src/fonts/"),
      Videos: path.join(__dirname, "./src/videos/"),
    },
  },

  plugins: [
    new PugPlugin({
      pretty: true,
      js: {
        filename: "js/[name].js",
      },
      css: {
        filename: "css/[name].css",
      },
    }),
  ],

  module: {
    rules: [
      {
        test: /\.pug$/,
        loader: PugPlugin.loader,
      },
      {
        test: /\.css$/,
        use: ["css-loader", "postcss-loader"],
      },
      {
        test: /\.(png|jpg|jpeg|ico|svg)$/,
        type: "asset/resource",
        generator: {
          // output filename of images
          filename: "img/[name][ext]",
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
        generator: {
          // output filename of fonts
          filename: "fonts/[name][ext][query]",
        },
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        type: "asset/resource",
        generator: {
          // output filename of videos
          filename: "videos/[name][ext]",
        },
      },
    ],
  },

  devServer: {
    open: true,
    static: {
      directory: path.join(__dirname, "dist"),
    },
    watchFiles: {
      paths: ["src/**/*.*"],
      options: {
        usePolling: true,
      },
    },
  },
};
