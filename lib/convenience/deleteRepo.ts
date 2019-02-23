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
    buttonForCommand,
    GitHubRepoRef,
    MappedParameters,
} from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    DeclarationType,
    slackInfoMessage,
    slackWarningMessage,
} from "@atomist/sdm";
import { deleteRepository } from "@atomist/sdm-core/lib/util/github/ghub";
import {
    bold,
    url,
} from "@atomist/slack-messages";

export interface DeleteRepoParameters {
    repo: string;
    owner: string;
}

/**
 * Select one of the current user's repo for possible deletion.
 */
export const selectRepoToDelete: CommandHandlerRegistration<DeleteRepoParameters> = {
    name: "SelectRepoToDelete",
    intent: ["delete repo", "kill -9"],
    description: "Select a repository to delete",
    parameters: {
        repo: {
            declarationType: DeclarationType.Mapped,
            uri: MappedParameters.GitHubRepository,
        },
        owner: {
            declarationType: DeclarationType.Mapped,
            uri: MappedParameters.GitHubOwner,
        },
    },
    listener: async ci => {
        const repoRef = GitHubRepoRef.from(ci.parameters);
        await ci.addressChannels(
            slackWarningMessage(
                "Delete Repository",
                `Really delete repo at ${url(repoRef.url)}? ${bold("Cannot be undone")}`,
                ci.context,
                {
                    actions: [buttonForCommand(
                        { text: `Delete repo at ${repoRef.url}?` },
                        "DeleteRepo",
                        ci.parameters as any)],
                }),
        );
    },
};

/**
 * Perform repo deletion. No intent so not directly available to users.
 */
export const deleteRepo: CommandHandlerRegistration<DeleteRepoParameters> = {
    name: "DeleteRepo",
    description: "Delete a repository",
    parameters: {
        owner: {},
        repo: {},
    },
    listener: async ci => {
        await ci.addressChannels(slackInfoMessage("Delete Repository", `Deleting ${bold(`ci.parameters.owner}/${ci.parameters.repo}`)}`));
        const grr = GitHubRepoRef.from(ci.parameters);
        await deleteRepository(ci.credentials, grr);
    },
};
