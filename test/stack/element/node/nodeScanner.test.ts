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
import { InMemoryFile } from "@atomist/automation-client/lib/project/mem/InMemoryFile";
import * as assert from "assert";
import { nodeScanner } from "../../../../lib/element/node/nodeScanner";

describe("nodeScanner", () => {

    it("should find environment variables", async () => {
        const p = InMemoryProject.of(new InMemoryFile("package.json", "{}"),
            new InMemoryFile("index.js", "process.env.NAME"));
        const ns = await nodeScanner(p, {} as any, undefined, { full: false });
        assert(ns);
        assert.deepStrictEqual(ns.referencedEnvironmentVariables, ["NAME"]);
    });

    it("should find but not duplicate environment variables", async () => {
        const p = InMemoryProject.of(new InMemoryFile("package.json", "{}"),
            new InMemoryFile("index.js", "process.env.NAME"),
            new InMemoryFile("other.js", "process.env.NAME"));
        const ns = await nodeScanner(p, {} as any, undefined, { full: false });
        assert(ns);
        assert.deepStrictEqual(ns.referencedEnvironmentVariables, ["NAME"]);
    });

});
