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

import { ParametersObjectValue } from "@atomist/sdm/lib/api/registration/ParametersDefinition";
import * as assert from "assert";
import {
    OptionalSeedParamsDefinitions,
    toRepoRef,
} from "../../../lib/generate/universal/SeedDrivenCommandParams";

describe("seedDrivenParams", () => {

    describe("toRepoRef", () => {

        it("should handle undefined", () => {
            const rr = toRepoRef(undefined);
            assert.strictEqual(rr, undefined);
        });

        it("should handle simple GitHub.com URL", () => {
            const rr = toRepoRef({ seedUrl: "https://github.com/owner/repo" });
            assert.strictEqual(rr.owner, "owner");
            assert.strictEqual(rr.repo, "repo");
            assert.strictEqual(rr.branch, undefined);
            assert.strictEqual(rr.sha, undefined);
            assert.strictEqual(rr.path, undefined);
        });

        it("should handle GitHub.com URL with path", () => {
            const rr = toRepoRef({ seedUrl: "https://github.com/owner/repo", path: "foo" });
            assert.strictEqual(rr.owner, "owner");
            assert.strictEqual(rr.repo, "repo");
            assert.strictEqual(rr.path, "foo");
        });

        it("should handle GitHub.com URL with branch", () => {
            const rr = toRepoRef({ seedUrl: "https://github.com/owner/repo", ref: "foo" });
            assert.strictEqual(rr.owner, "owner");
            assert.strictEqual(rr.repo, "repo");
            assert.strictEqual(rr.branch, "foo");
            assert.strictEqual(rr.sha, undefined);
        });

        it("should handle GitHub.com URL with sha", () => {
            const rr = toRepoRef({
                seedUrl: "https://github.com/owner/repo",
                ref: "4a8dba6c39b5d07b7aa84fca5515bebbebf5ef7a",
            });
            assert.strictEqual(rr.owner, "owner");
            assert.strictEqual(rr.repo, "repo");
            assert.strictEqual(rr.branch, undefined);
            assert.strictEqual(rr.sha, "4a8dba6c39b5d07b7aa84fca5515bebbebf5ef7a");
        });

    });

    describe("optional parameters", () => {

        it("should accept valid refs", () => {
            const refs = ["thing", "4a8dba6c39b5d07b7aa84fca5515bebbebf5ef7a"];
            for (const ref of refs) {
                assert((OptionalSeedParamsDefinitions.ref as ParametersObjectValue).pattern.test(ref),
                    `Ref '${ref}' should be valid`);
            }
        });

        it("should reject invalid refs", () => {
            const refs = ["%%%64p94u6jyyjrjfktj", "_ _", "a and this"];
            for (const ref of refs) {
                assert(!(OptionalSeedParamsDefinitions.ref as ParametersObjectValue).pattern.test(ref),
                    `Ref '${ref}' should be invalid`);
            }
        });

        it("should accept valid paths", () => {
            const paths = ["thing", "a/b", "e/_weiruoeiur$", "a/et_13"];
            for (const path of paths) {
                assert((OptionalSeedParamsDefinitions.path as ParametersObjectValue).pattern.test(path),
                    `Path '${path}' should be valid`);
            }
        });

        it("should reject invalid paths", () => {
            const paths = ["a/ b /cd", "a\\b", "///", "/"];
            for (const path of paths) {
                assert(!(OptionalSeedParamsDefinitions.path as ParametersObjectValue).pattern.test(path),
                    `Path '${path}' should be invalid`);
            }
        });

    });

});
