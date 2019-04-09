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
    logger,
    Project,
} from "@atomist/automation-client";
import {
    chainTransforms,
    CodeTransform,
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
import * as _ from "lodash";
import { SdmEnablementTransform } from "../support/sdmEnablement";
import {
    OptionalSeedParamsDefinitions,
    SeedDrivenCommandConfig,
    SeedDrivenCommandParams,
    toRepoRef,
} from "./SeedDrivenCommandParams";

interface Analyzed {
    analysis: ProjectAnalysis;
    transformsToApply: Array<CodeTransform<any>>;
}

/**
 * Generator that can work against any seed, asking for further parameters as needed.
 * Requires dynamic parameters.
 * Driven by registered TransformRecipes returned in a full project analysis.
 */
export function universalGenerator(projectAnalyzer: ProjectAnalyzer,
                                   config: SeedDrivenCommandConfig): GeneratorRegistration<SeedDrivenCommandParams> {
    return {
        ...config,
        parameters: {
            ...OptionalSeedParamsDefinitions,
            seedUrl: config.seedParameter,
        },
        startingPoint: async pi => {
            // Clone and analyze the project to determine what additional parameters
            // to ask for
            const project = await GitCommandGitProject.cloned(
                pi.credentials,
                toRepoRef(pi.parameters),
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
                const analyzed = pi.parameters as any as Analyzed;
                await displayMessages(pi, analyzed.analysis);
                const transforms = analyzed.transformsToApply;
                await pi.addressChannels(`Running ${transforms.length} transform${transforms.length !== 1 ? "s" : ""} against your seed project`);
                await addProvenanceFile(p, pi, _.flatten(analyzed.analysis.seedAnalysis.transformRecipes));
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
    const requiredTransformRecipes = analysis.seedAnalysis.transformRecipes.filter(r => !r.optional);
    const optionalTransformRecipes = analysis.seedAnalysis.transformRecipes.filter(r => r.optional);

    // Work out which optional parameters are required
    const transformsToTake: ParametersObject<any> = {};
    for (const recipeRequest of optionalTransformRecipes) {
        transformsToTake[recipeRequest.originator] = {
            type: {
                options: [{
                    value: "yes",
                    description: "yes",
                }, {
                    value: "no",
                    description: "no",
                }],
                kind: "single",
            },
            description: `Add ${recipeRequest.description}?`,
        };
    }
    const optionalTransformsParams: any = optionalTransformRecipes.length > 0 ?
        await ctx.promptFor<P>(transformsToTake) :
        [];
    const relevantTransformRecipes = requiredTransformRecipes.concat(
        optionalTransformRecipes.filter(o => optionalTransformsParams[o.originator] === "yes"),
    );
    (ctx.parameters as Analyzed).transformsToApply = _.flatten(relevantTransformRecipes.map(r => r.recipe.transforms));

    const unsatisfiedParameters: ParametersObject<any> = {};
    for (const recipeRequest of relevantTransformRecipes) {
        recipeRequest.recipe.parameters
            .filter(p => !ctx.parameters[p.name])
            .forEach(p => {
                unsatisfiedParameters[p.name] = p;
            });
    }
    const newParams: any = await ctx.promptFor<P>(unsatisfiedParameters);
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
