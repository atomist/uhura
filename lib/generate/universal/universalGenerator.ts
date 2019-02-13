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
    logger,
    Project,
} from "@atomist/automation-client";
import {
    chainTransforms,
    CommandListenerInvocation,
    GeneratorRegistration,
    ParametersObject,
    PushAwareParametersInvocation,
    SdmContext,
    slackInfoMessage,
    slackWarningMessage,
} from "@atomist/sdm";
import {
    ProjectAnalysis,
    ProjectAnalyzer,
    TransformRecipeRequest,
} from "@atomist/sdm-pack-analysis";
import * as gitUrlParse from "git-url-parse";
import * as _ from "lodash";
import { SdmEnablementTransform } from "../support/sdmEnablement";
import {
    SeedDrivenCommandConfig,
    SeedDrivenCommandParams,
} from "./SeedDrivenCommandParams";
import { FreeTextSeedUrlParameterDefinition } from "./seedParameter";

/**
 * Command name for the universal generator.
 * Other commands often front the universal generator, feeding it a
 * seedUrl parameter, so it's important to provide a stable name.
 */
export const UniversalGeneratorName = "UniversalGenerator";

interface Analyzed {
    analysis: ProjectAnalysis;
}

/**
 * Generator that can work against any seed, asking for further parameters as needed.
 * Requires dynamic parameters.
 * Driven by registered TransformRecipes returned in a full project analysis.
 */
export function universalGenerator(projectAnalyzer: ProjectAnalyzer,
                                   config: SeedDrivenCommandConfig = {
        name: UniversalGeneratorName,
        intent: "create",
        seedParameter: FreeTextSeedUrlParameterDefinition,
    }): GeneratorRegistration<SeedDrivenCommandParams> {
    return {
        ...config,
        parameters: {
            seedUrl: config.seedParameter,
        },
        startingPoint: async pi => {
            // Clone and analyze the project to determine what additional parameters
            // to ask for
            const gitUrl = gitUrlParse(pi.parameters.seedUrl);
            const project = await GitCommandGitProject.cloned(
                pi.credentials,
                GitHubRepoRef.from({ owner: gitUrl.owner, repo: gitUrl.name }),
                { depth: 1 });
            const analysis = await projectAnalyzer.analyze(project, pi, { full: true });
            await enhanceWithSpecificParameters(analysis, pi as any);

            // Save the analysis on the invocation
            (pi.parameters as any as Analyzed).analysis = analysis;
            return project;
        },
        transform: async (p, pi) => {
            try {
                logger.debug("In transform: parameters are %j", pi.parameters);
                const analysis = (pi.parameters as any as Analyzed).analysis;
                await displayMessages(pi, analysis);
                const transforms = _.flatten(analysis.seedAnalysis.transformRecipes.map(r => r.recipe.transforms));
                await pi.addressChannels(`Running ${transforms.length} transform${transforms.length !== 1 ? "s" : ""} against your seed project`);
                await addProvenanceFile(p, pi, _.flatten(analysis.seedAnalysis.transformRecipes));
                // tslint:disable-next-line:deprecation
                const trans = chainTransforms(...transforms, SdmEnablementTransform);
                return trans(p, pi, pi.parameters);
            } catch (err) {
                logger.warn("Error transforming project: %s", err.errorMessage);
                return { code: 1, edited: false, success: false, target: p };
            }
        },
    };
}

/**
 * Enrich parameters with the extras if needed
 */
async function enhanceWithSpecificParameters<P>(analysis: ProjectAnalysis,
                                                ctx: CommandListenerInvocation<any>): Promise<void> {
    const parameters: ParametersObject<any> = {};
    for (const recipeRequest of analysis.seedAnalysis.transformRecipes) {
        recipeRequest.recipe.parameters
            .filter(p => !ctx.parameters[p.name])
            .forEach(p => {
                (parameters as any)[p.name] = p;
            });
    }
    const newParams: any = await ctx.promptFor<P>(parameters);
    for (const name of Object.getOwnPropertyNames(newParams)) {
        ctx.parameters[name] = newParams[name];
    }
}

/**
 * Display messages from the SeedAnalysis to the user
 */
async function displayMessages(sdmContext: SdmContext,
                               analysis: ProjectAnalysis): Promise<void> {
    for (const message of _.flatten(analysis.seedAnalysis.transformRecipes.map(r => r.recipe.messages || []))) {
        await sdmContext.addressChannels(
            slackInfoMessage("Seed Analysis", message));
    }
    for (const message of _.flatten(analysis.seedAnalysis.transformRecipes.map(r => r.recipe.warnings || []))) {
        await sdmContext.addressChannels(
            slackWarningMessage("Seed Analysis", message, sdmContext.context));
    }
}

/**
 * Add a provenance file to the repo
 */
async function addProvenanceFile(
    p: Project,
    pi: PushAwareParametersInvocation<SeedDrivenCommandParams>,
    transformRecipeRequests: TransformRecipeRequest[]): Promise<void> {
    await p.addFile(
        ".provenance",
        `This project was created by Atomist from seed project ${pi.parameters.seedUrl}\n\n` +
        `Transform recipes:\n${transformRecipeRequests.map(tr => "\t" + tr.originator).join("\n")}\n`);
}
