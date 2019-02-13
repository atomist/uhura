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

import { InMemoryProject } from "@atomist/automation-client";
import * as assert from "assert";
import { travisScanner } from "../../../../lib/element/travis/travisScanner";

describe("travis scanner", () => {

    it("should return undefined if no travis file", async () => {
        const p = InMemoryProject.of();
        const scanned = await travisScanner(p, undefined, undefined, { full: true });
        assert.strictEqual(scanned, undefined);
    });

    it("should find no scripts", async () => {
        const p = InMemoryProject.of({
            path: ".travis.yml",
            content: simpleTravis,
        });
        const scanned = await travisScanner(p, undefined, undefined, { full: false });
        assert.deepStrictEqual(scanned.services, {});
        assert.deepStrictEqual(scanned.scripts, []);
    });

    it("should find scripts", async () => {
        const p = InMemoryProject.of({
            path: ".travis.yml",
            content: servicesTravis,
        });
        const scanned = await travisScanner(p, undefined, undefined, { full: false });
        assert.deepStrictEqual(scanned.scripts, [
            "npm start test",
            "npm start test.integration",
            "npm start test.e2e",
            "npm start build",
        ]);
    });

    it("should find services", async () => {
        const p = InMemoryProject.of({
            path: ".travis.yml",
            content: servicesTravis,
        });
        const scanned = await travisScanner(p, undefined, undefined, { full: true });
        assert.deepStrictEqual(scanned.services, {
            riak: {},
            rabbitmq: {},
            memcached: {},
        });
    });

    it("should find services in JSON", async () => {
        const p = InMemoryProject.of({
            path: ".travis.yml",
            content: travisJson,
        });
        const scanned = await travisScanner(p, undefined, undefined, { full: false });
        assert.deepStrictEqual(scanned.services, {
            mongodb: {},
        });
    });

    it("should handle lifecycle", async () => {
        const p = InMemoryProject.of({
            path: ".travis.yml",
            content: notifications,
        });
        const scanned = await travisScanner(p, undefined, undefined, { full: false });
        assert.deepStrictEqual(scanned.services, {});
        assert.strictEqual(scanned.scripts.length, 3);
        assert.deepStrictEqual(scanned.afterSuccess, ["npm run coveralls"]);
        assert.deepStrictEqual(scanned.env, {});
    });

    it("should handle env", async () => {
        const p = InMemoryProject.of({
            path: ".travis.yml",
            content: withEnv,
        });
        const scanned = await travisScanner(p, undefined, undefined, { full: false });
        assert.deepStrictEqual(scanned.services, {});
        assert.deepStrictEqual(scanned.env, {
            DB: "postgres",
            SH: "bash",
            PACKAGE_VERSION: "1.0.*",
        });
        assert(!scanned.addons);
    });

    it("should note presence of addons", async () => {
        const p = InMemoryProject.of({
            path: ".travis.yml",
            content: addons,
        });
        const scanned = await travisScanner(p, undefined, undefined, { full: false });
        assert(!!scanned.addons);
    });

});

const simpleTravis = `language: node_js
node_js:
  - "8.9.4"
`;

const withEnv = `language: node_js
node_js:
  - "8.9.4"

env:
  - DB=postgres
  - SH=bash
  - PACKAGE_VERSION="1.0.*"`;

const servicesTravis = `language: node_js
node_js:
  - "8.9.4"
install:
  - yarn install
env:
  - DB_TYPE="sqlite" DB_DATABASE="./mydb.sql" DB_LOGGING=false
services:
  - riak
  - rabbitmq
  - memcached
script:
  - npm start test
  - npm start test.integration
  - npm start test.e2e
  - npm start build
notifications:
  email: false`;

const notifications = `language: node_js

node_js:
  - 'node'
  - 'lts/*'

script:
  - node ./internals/scripts/generate-templates-for-linting
  - npm test -- --maxWorkers=4
  - npm run build

before_install:
  - export CHROME_BIN=chromium-browser
  - export DISPLAY=:99.0
  - sh -e /etc/init.d/xvfb start

notifications:
  email:
    on_failure: change

after_success: 'npm run coveralls'

cache:
  directories:
    - node_modules`;

const addons = `language: node_js

addons:
  firefox: "17.0"
`;

// Yes this is legal, as .travis.yml
const travisJson = `{
  "language": "node_js",
  "node_js": "8",
  "services": [
    "mongodb"
  ],
  "script": [
    "npm run build",
    "npm run test"
  ]
}`;
