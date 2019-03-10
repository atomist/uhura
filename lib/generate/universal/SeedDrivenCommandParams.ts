import { BaseParameter, GitHubRepoRef, RemoteRepoRef } from "@atomist/automation-client";
import { CommandConfig } from "../../common/CommandConfig";
import { isValidSHA1 } from "@atomist/sdm-local/lib/common/git/handlePushBasedEventOnRepo";
import gitUrlParse = require("git-url-parse");
import { ParametersObject } from "@atomist/sdm";

export interface SeedDrivenCommandParams {

    /**
     * URL of seed repo.
     */
    seedUrl: string;

    /**
     * Branch or sha. Handling will be determined by the format
     */
    ref?: string;

    /**
     * Path within the repo. Undefined or "" means the root.
     */
    path?: string;
}

export type SeedDrivenCommandConfig = CommandConfig & { seedParameter: BaseParameter };

/**
 * Create a RemoteRepoRef instances from these parameters
 * @return {RemoteRepoRef}
 */
export function toRepoRef(params: SeedDrivenCommandParams): RemoteRepoRef {
    if (!params) {
        return undefined;
    }
    const gitUrl = gitUrlParse(params.seedUrl);
    return GitHubRepoRef.from({
        owner: gitUrl.owner,
        repo: gitUrl.name,
        path: params.path,
        branch: !!params.ref && !isValidSHA1(params.ref) ? params.ref : undefined,
        sha: !!params.ref && isValidSHA1(params.ref) ? params.ref : undefined,
    });
}

/**
 * Optional parameter definitions
 */
export const OptionalSeedParamsDefinitions: ParametersObject<Pick<SeedDrivenCommandParams, "ref" | "path">> = {
    ref: {
        required: false,
        description: "git ref: branch name or sha",
        validInput: "Git branch name or sha",
        pattern: /^\w(?:[./]?[-\w])*$/,
    },
    path: {
        required: false,
        description: "Path within repo",
        validInput: "File path",
        pattern: /^([\w\$]+[/]?)+$/,
    },
};
