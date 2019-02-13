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
    GitCommandGitProject,
    GitHubRepoRef,
    Project,
    SeedDrivenGeneratorParameters,
} from "@atomist/automation-client";
import {
    actionableButton,
    CommandHandlerRegistration,
    GeneratorRegistration,
    ParametersInvocation,
    SdmContext,
    slackErrorMessage,
    slackInfoMessage,
    slackSuccessMessage,
} from "@atomist/sdm";
import {
    isUsableAsSeed,
    ProjectAnalyzer,
} from "@atomist/sdm-pack-analysis";
import {
    NodeProjectCreationParametersDefinition,
    UpdatePackageJsonIdentification,
    UpdateReadmeTitle,
} from "@atomist/sdm-pack-node";
import { PushAwareParametersInvocation } from "@atomist/sdm/lib/api/registration/PushAwareParametersInvocation";
import { url } from "@atomist/slack-messages";
import gitUrlParse = require("git-url-parse");
import {
    SelectedRepo,
    SelectedRepoFinder,
    SelectedRepoSource,
} from "../../common/SelectedRepoFinder";
import { SdmEnablementTransform } from "../support/sdmEnablement";
import {
    SeedDrivenCommandConfig,
    SeedDrivenCommandParams,
} from "../universal/SeedDrivenCommandParams";
import { FreeTextSeedUrlParameterDefinition } from "../universal/seedParameter";
import {
    addProvenanceFile,
    UniversalNodeGeneratorParams,
} from "../universal/universalNodeGenerator";

export type ForkSeedParameters = UniversalNodeGeneratorParams;

/**
 * Add a seed to the current org from anywhere else.
 * @return {CommandHandlerRegistration}
 */
export function importSeed(projectAnalyzer: ProjectAnalyzer,
                           config: SeedDrivenCommandConfig = {
                               name: "ImportSeed",
                               intent: ["import seed", "import seed project"],
                               description: "bring a new seed project into your organization, allowing you to customize it",
                               seedParameter: FreeTextSeedUrlParameterDefinition,
                           }): GeneratorRegistration<ForkSeedParameters> {
    return {
        ...config,
        parameters: {
            ...NodeProjectCreationParametersDefinition,
            seedUrl: config.seedParameter,
        },
        startingPoint: async pi => {
            return validateSeed(projectAnalyzer, pi);
        },
        transform: [
            UpdateReadmeTitle,
            UpdatePackageJsonIdentification,
            addProvenanceFile,
            SdmEnablementTransform,
            async (_, papi) => registerSeedFromTarget(papi),
        ],
    };
}

/**
 * Lists the seeds available to the current user
 */
export function listSeeds(projectAnalyzer: ProjectAnalyzer): CommandHandlerRegistration {
    return {
        name: "ListSeeds",
        intent: "list seeds",
        description: "list seed projects registered in your organization",
        listener: async ci => {
            const seeds = await getSeeds(ci);
            const msg = slackInfoMessage(
                "Seeds",
                `You have ${seeds.seeds.length} seed project${seeds.seeds.length !== 1 ? "s" : ""} registered in your organization`, {
                actions: [actionableButton<SeedDrivenCommandParams & { description: string }>({ text: "Add Seed" }, addSeed(projectAnalyzer))],
            });
            for (const seed of seeds.seeds) {
                msg.attachments.push({
                    text: seed.description,
                    fallback: seed.description,
                    footer: url(seed.url),
                    actions: [actionableButton<{ seedUrl: string }>({ text: "Remove Seed" }, removeSeed(), { seedUrl: seed.url })],
                });
            }
            await ci.addressChannels(msg);
        },
    };
}

/**
 * Add someone else's seed
 * @return {CommandHandlerRegistration<SeedDrivenCommandParams>}
 */
export function addSeed(projectAnalyzer: ProjectAnalyzer,
                        config: SeedDrivenCommandConfig = {
                            name: "AddSeed",
                            intent: "add seed",
                            description: "register a seed project for your organization, without forking it",
                            seedParameter: FreeTextSeedUrlParameterDefinition,
                        }): CommandHandlerRegistration<SeedDrivenCommandParams & { description: string }> {
    return {
        ...config,
        parameters: {
            seedUrl: config.seedParameter,
            description: { description: "Seed project to choose.", pattern: /.*/ },
        },
        listener: async ci => {
            await validateSeed(projectAnalyzer, ci);
            return registerSeed(ci, {
                url: ci.parameters.seedUrl,
                description: ci.parameters.description,
            });
        },
    };
}

export function removeSeed(
    config: SeedDrivenCommandConfig = {
        name: "RemoveSeed",
        intent: "remove seed",
        description: "remove a seed project registered in your organization",
        seedParameter: FreeTextSeedUrlParameterDefinition,
    }): CommandHandlerRegistration<SeedDrivenCommandParams> {
    return {
        ...config,
        parameters: {
            seedUrl: config.seedParameter,
        },
        listener: async ci => {
            await deregisterSeed(ci, ci.parameters.seedUrl);
        },
    };
}

async function registerSeedFromTarget(papi: PushAwareParametersInvocation<ForkSeedParameters & SeedDrivenGeneratorParameters>): Promise<void> {
    const seed: SelectedRepo = {
        url: papi.parameters.target.repoRef.url,
        description: papi.parameters.target.description || "My new seed project",
    };
    return registerSeed(papi, seed);
}

/**
 * Register the selected repo as a seed
 * @param {SdmContext} ctx
 * @param {SelectedRepo} seed
 * @return {Promise<void>}
 */
async function registerSeed(ctx: SdmContext, seed: SelectedRepo): Promise<void> {
    const seeds = await getSeeds(ctx);
    seeds.seeds.push(seed);
    await ctx.preferences.put<Seeds>("seeds", seeds);
    await ctx.addressChannels(
        slackSuccessMessage(
            "Seeds",
            `Successfully added seed project _${seed.description}_ from ${url(seed.url)}`));
}

/**
 * Deregister the repo with the given URL as a seed
 * @param {SdmContext} papi
 * @param {string} seedUrl
 * @return {Promise<void>}
 */
async function deregisterSeed(papi: SdmContext, seedUrl: string): Promise<void> {
    const seeds = await getSeeds(papi);
    seeds.seeds = seeds.seeds.filter(seed => seed.url !== seedUrl);
    await papi.preferences.put<Seeds>("seeds", seeds);
    await papi.addressChannels(
        slackSuccessMessage(
            "Seeds",
            `Successfully removed seed project ${url(seedUrl)}`));
}

/**
 * What seeds are available for the present user?
 * @param {SdmContext} ctx
 * @return {Promise<Seeds>}
 */
async function getSeeds(ctx: SdmContext): Promise<Seeds> {
    const found = await ctx.preferences.get<Seeds>("seeds");
    return found || { seeds: [] };
}

/**
 * Return seeds based on preferences
 * @param {SdmContext} ci
 * @return {Promise<Rx.IPromise<any>>}
 */
export const preferencesSeedFinder: SelectedRepoFinder = async ci =>
    getSeeds(ci).then(seeds => seeds.seeds);

/**
 * Return seeds based on preferences
 */
export const preferencesSeedSource: SelectedRepoSource = {
    description: "Seeds from your organization",
    seedFinder: preferencesSeedFinder,
};

interface Seeds {

    seeds: SelectedRepo[];
}

/**
 * Validate the repo as a potential seed, throwing an exception if its invalid
 * @param {ProjectAnalyzer} projectAnalyzer
 * @param {ParametersInvocation<SeedDrivenCommandParams>} pi
 * @return {Promise<void>}
 */
async function validateSeed(projectAnalyzer: ProjectAnalyzer,
                            pi: ParametersInvocation<SeedDrivenCommandParams>): Promise<Project> {
    const gitUrl = gitUrlParse(pi.parameters.seedUrl);
    const project = await GitCommandGitProject.cloned(
        pi.credentials,
        GitHubRepoRef.from({ owner: gitUrl.owner, repo: gitUrl.name }),
        { depth: 1 });
    const analysis = await projectAnalyzer.analyze(project, pi, { full: true });
    if (!isUsableAsSeed(analysis) || !analysis.elements.node) {
        const msg = `Seed at ${url(pi.parameters.seedUrl)} is not usable as a seed repo: ` +
            "Only Node seeds are presently supported";
        await pi.addressChannels(":no_entry: " + msg);
        await pi.addressChannels(
            slackErrorMessage(
                "Seeds",
                msg,
                pi.context));
        throw new Error(msg);
    }
    return project;
}
