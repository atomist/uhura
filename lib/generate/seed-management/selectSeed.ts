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

import { CommandHandlerRegistration } from "@atomist/sdm";
import * as gitUrlParse from "git-url-parse";
import { CommandConfig } from "../../common/CommandConfig";
import { SelectedRepoSource } from "../../common/SelectedRepoFinder";
import { selectedReposAttachmentsMessage } from "../support/selectedRepoAttachments";

export interface SelectSeedOptions extends CommandConfig {

    /**
     * Sources of seeds. Ordering is important.
     */
    sources: SelectedRepoSource[];

    generatorsToShow: number;
    generatorName: string;
}

/**
 * Front a generator with a dynamic selection of seeds based on preferences.
 * @return {CommandHandlerRegistration}
 */
export function selectSeed(opts: SelectSeedOptions): CommandHandlerRegistration {
    return {
        ...opts,
        listener: async cli => {
            for (const source of opts.sources) {
                await cli.addressChannels(`_${source.description}_`);
                const seeds = await source.seedFinder(cli);
                const message = selectedReposAttachmentsMessage(seeds, {
                    reposToShow: opts.generatorsToShow,
                    commandName: opts.generatorName,
                    caption: `_${source.description}_`,
                    buttonText: seed => {
                        const gu = gitUrlParse(seed.url);
                        return `Create from ${gu.name}`;
                    },
                });
                await cli.addressChannels(message);
            }
        },
    };
}
