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

import { ProjectListener } from "@atomist/sdm";
import { ProjectAnalyzer } from "@atomist/sdm-pack-analysis";

/**
 * Runs on a channel link event to suggest further things
 * @return {Promise<void>}
 */
export function enhanceNewRepo(projectAnalyzer: ProjectAnalyzer): ProjectListener {
    return async cli => {
        const analysis = await projectAnalyzer.analyze(cli.project, cli, { full: true });
        for (const sr of analysis.seedAnalysis.transformRecipes.filter(tr => tr.optional)) {
            // TODO offer a button to run each transform - What about parameters?
            await cli.addressChannels("Should allow you to run generator");
        }
    };
}

export function ideLinkToNewRepo(): ProjectListener {
    return async cli => {
        await cli.addressChannels(`Edit at https://gitpod.io#${cli.id.url}`, {});
    };
}

// TODO add new topics to the repo
