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

import {
    BaseParameter,
    GitHubRepoRef,
    RemoteRepoRef,
} from "@atomist/automation-client";
import { ParametersObject } from "@atomist/sdm";
import gitUrlParse = require("git-url-parse");
import { CommandConfig } from "../../common/CommandConfig";

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
 * Optional parameter definitions for ref and path
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

function isValidSHA1(s: string): boolean {
    return s.match(/[a-fA-F0-9]{40}/) !== null;
}
