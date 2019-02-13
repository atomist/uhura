/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { SelectedRepo } from "../common/SelectedRepoFinder";

/**
 * Default hard-coded list of seeds.
 */
export const DefaultSeeds: SelectedRepo[] = [
    {
        url: "https://github.com/sahat/hackathon-starter",
        description: "Node boilerplate (Hackathon starter)",
    },
    {
        url: "https://github.com/kimjuny/koa-react-universal",
        description: "Lightweight React-Koa2 universal boilerplate",
    },
    {
        url: "https://github.com/developit/express-es6-rest-api",
        description: "ES6 RESTful Express API",
    },
    /*
    // ^^^ Working
    {
        // TODO uses Travis but could be emulated
        // Locally get the same build failure as Atomist does, running the Travis script
        url: "https://github.com/gdi2290/angular-starter",
        description: "Angular/TypeScript",
    }, {
        // TODO doesn't have a start script
        url: "https://github.com/h5bp/html5-boilerplate",
        description: "Template for fast, robust, and adaptable web apps or sites",
    }, {
        // TODO no Docker file
        url: "https://github.com/react-boilerplate/react-boilerplate",
        description: "Scalable React boilerplate",
    }, {
        // TODO issue running start
        url: "https://github.com/kriasoft/nodejs-api-starter",
        description: "GraphQL endpoint microservice",
    }, {
        // TODO hard to build, inconsistent license files
        url: "https://github.com/clintonwoo/hackernews-react-graphql",
        description: "React/GraphQL Hacker News clone",
    },
    */
];
