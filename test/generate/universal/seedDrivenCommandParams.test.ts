import * as assert from "assert";
import { OptionalSeedParamsDefinitions, toRepoRef } from "../../../lib/generate/universal/SeedDrivenCommandParams";
import { ParametersObjectValue } from "@atomist/sdm/lib/api/registration/ParametersDefinition";

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
