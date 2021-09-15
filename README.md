# Twitter API Script

A script that fetches data from the Twitter API using Node.js and saves it on an arangoDB Database in order to create a retweet graph.

This script is part of the Bachelor Thesis "Algorithmic Approaches to Overlapping Community Detection - Twitter Data from the G7 Summit and its Engagement Groups"

## Development

### Setup

To download the node modules run `npm install`.

### Compile

The code is written in TypeScript which is stored in `./src` and must first be compiled using the `tsc` command. Compiler options are specified in the `tsconfig.json` file. The output will be put in the `./dist` folder.

If typescript is not installed, run `npm install -g typescript`.

### Run

To run the script run `node dist/index.js` in the command line.
