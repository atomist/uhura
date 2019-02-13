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

import { buttonForCommand } from "@atomist/automation-client";
import {
    Attachment,
    SlackMessage,
} from "@atomist/slack-messages";
import { SelectedRepo } from "../../common/SelectedRepoFinder";

export interface SelectRepoDisplayOptions {
    reposToShow: number;
    commandName: string;
    caption: string;

    /**
     * Text for each listing
     * @param {SelectedRepo} sr
     * @return {string}
     */
    buttonText: (sr: SelectedRepo) => string;
}

/**
 * Create an attachment with buttons fronting a command that takes repo URL
 * @return {SlackMessage | string}
 */
export function selectedReposAttachmentsMessage(selectedRepos: SelectedRepo[],
                                                opts: SelectRepoDisplayOptions): SlackMessage | string {
    if (selectedRepos.length === 0) {
        return "No repos to show";
    }
    const attachments = selectedRepoAttachments(selectedRepos, opts);
    const buttonsMessage: SlackMessage = {
        attachments: attachments.slice(0, opts.reposToShow),
    };
    return buttonsMessage;
}

/**
 * Display generator buttons. Front
 * a generator with the given name.
 */
export function selectedRepoAttachments(selectedRepos: SelectedRepo[],
                                        opts: Pick<SelectRepoDisplayOptions, "commandName" | "buttonText" >): Attachment[] {
    const attachments: Attachment[] = [];
    for (const selectedRepo of selectedRepos) {
        attachments.push({
            text: `_${selectedRepo.description}_ - ${selectedRepo.url}`,
            fallback: selectedRepo.url,
            actions: [buttonForCommand(
                { text: opts.buttonText(selectedRepo) },
                opts.commandName,
                { seedUrl: selectedRepo.url },
            )],
        });
    }
    return attachments;
}
