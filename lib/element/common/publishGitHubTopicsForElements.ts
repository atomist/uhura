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
    Configuration,
    GitHubRepoRef,
    HttpMethod,
    logger,
    RemoteRepoRef,
} from "@atomist/automation-client";
import { isGitHubRepoRef } from "@atomist/automation-client/lib/operations/common/GitHubRepoRef";
import {
    ProjectListener,
    SdmContext,
    slackInfoMessage,
    SoftwareDeliveryMachine,
    toToken,
} from "@atomist/sdm";
import {
    allTechnologyElements,
    ProjectAnalyzer,
} from "@atomist/sdm-pack-analysis";
import * as slack from "@atomist/slack-messages";

/**
 * Add GitHub topics to the new repo for tags
 */
export function publishGitHubTopicsForElements(projectAnalyzer: ProjectAnalyzer,
                                               sdm: SoftwareDeliveryMachine): ProjectListener {
    return async cli => {
        try {
            const analysis = await projectAnalyzer.analyze(cli.project, cli, { full: true });
            const names = allTechnologyElements(analysis).map(e => e.name).filter(name => name !== "preferences");
            await publishTopics(cli.id, names, cli, sdm.configuration);
            await cli.addressChannels(
                slackInfoMessage(
                    "Create Project",
                    `Published GitHub topics ${names.map(slack.codeLine).join(", ")} for ${
                        slack.bold(slack.url(cli.id.url, `${cli.id.owner}/${cli.id.repo}`))}`));
        } catch (err) {
            logger.warn("Failed to publish topics for repo at %j, %s", cli.id, err.message);
        }
    };
}

async function publishTopics(rr: RemoteRepoRef,
                             names: string[],
                             ctx: SdmContext,
                             configuration: Configuration): Promise<void> {
    const grr = isGitHubRepoRef(rr) ? rr : new GitHubRepoRef(rr.owner, rr.repo);
    const url = `${grr.scheme}${grr.apiBase}/repos/${grr.owner}/${grr.repo}/topics`;

    const http = configuration.http.client.factory.create(url);
    await http.exchange(
        url,
        {
            method: HttpMethod.Put,
            body: { names },
            headers: {
                ...authHeader(toToken(ctx.credentials)),
                Accept: "application/vnd.github.mercy-preview+json",
            },
        });
}

function authHeader(token: string): any {
    return token ? {
            Authorization: `token ${token}`,
        }
        : {};
}
