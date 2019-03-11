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
    configurationValue,
    MappedParameters,
} from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    DeclarationType,
    Goal,
    PreferenceScope,
    SdmContext,
    slackSuccessMessage,
    slackWarningMessage,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import {
    bold,
    codeLine,
    italic,
} from "@atomist/slack-messages";
import * as _ from "lodash";

const OwnerAndRepo = {
    owner: { uri: MappedParameters.GitHubOwner, declarationType: DeclarationType.Mapped },
    repo: { uri: MappedParameters.GitHubRepository, declarationType: DeclarationType.Mapped },
};

export async function toggleSdmEnablement(repo: { owner: string, repo?: string }, optIn: boolean, ctx: SdmContext): Promise<void> {
    const slug = `${repo.owner}${!!repo.repo ? `/${repo.repo}` : ""}`;
    await ctx.preferences.put(`${slug}:enabled`,
        optIn,
        { scope: PreferenceScope.Sdm });
    if (optIn) {
        await ctx.addressChannels(
            slackSuccessMessage(
                `Enable SDM`,
                `Successfully enabled ${italic(configurationValue("sdm.name"))} ${
                    codeLine(configurationValue("name"))} for ${bold(slug)}`));
    } else {
        await ctx.addressChannels(
            slackWarningMessage(
                `Disable SDM`,
                `Successfully disabled ${italic(configurationValue("sdm.name"))} ${
                    codeLine(configurationValue("name"))} for ${bold(slug)}`,
                ctx.context));
    }
}

export function createToggleSdmEnablementCommand(sdm: SoftwareDeliveryMachine,
                                                 enable: boolean): CommandHandlerRegistration<{ owner: string, repo: string }> {
    return {
        intent: `${enable ? "enable" : "disable"} ${sdm.configuration.name.replace("@", "")}`,
        name: enable ? "EnableCommand" : "DisableCommand",
        description: enable ? "Enable SDM on a repository" : "Disable SDM on a repository",
        autoSubmit: true,
        parameters: OwnerAndRepo,
        listener: async ci => toggleSdmEnablement({ ...ci.parameters }, enable, ci),
    };
}

export function createToggleSdmEnablementOrgCommand(sdm: SoftwareDeliveryMachine,
                                                    enable: boolean): CommandHandlerRegistration<{ owner: string }> {
    return {
        intent: `${enable ? "enable org" : "disable org"} ${sdm.configuration.name.replace("@", "")}`,
        name: enable ? "EnableOrgCommand" : "DisableOrgCommand",
        description: enable ? "Enable SDM on an organization" : "Disable SDM on an organization",
        autoSubmit: true,
        parameters: { owner: OwnerAndRepo.owner },
        listener: async ci => toggleSdmEnablement({ ...ci.parameters }, enable, ci),
    };
}

/**
 * Command to enable this SDM for the repository/project
 * @param sdm
 */
export function enableCommand(sdm: SoftwareDeliveryMachine): CommandHandlerRegistration<{ owner: string, repo: string }> {
    return createToggleSdmEnablementCommand(sdm, true);
}

/**
 * Command to disable this SDM for the repository/project
 * @param sdm
 */
export function disableCommand(sdm: SoftwareDeliveryMachine): CommandHandlerRegistration<{ owner: string, repo: string }> {
    return createToggleSdmEnablementCommand(sdm, false);
}

/**
 * Command to enable this SDM for the owner
 * @param sdm
 */
export function enableOrgCommand(sdm: SoftwareDeliveryMachine): CommandHandlerRegistration<{ owner: string }> {
    return createToggleSdmEnablementOrgCommand(sdm, true);
}

/**
 * Command to disable this SDM for the owner
 * @param sdm
 */
export function disableOrgCommand(sdm: SoftwareDeliveryMachine): CommandHandlerRegistration<{ owner: string }> {
    return createToggleSdmEnablementOrgCommand(sdm, false);
}

export async function toggleGoalEnablement(sdm: SoftwareDeliveryMachine,
                                           goal: string,
                                           optIn: boolean,
                                           ctx: SdmContext): Promise<void> {
    const optionalGoals = _.get(sdm, "configuration.sdm.goal.optional", []);
    if (!optionalGoals.some((g: Goal) => g.definition.displayName === goal)) {
        await ctx.addressChannels(
            slackWarningMessage(
                optIn ? "Enable Goal" : "Disable Goal",
                `Goal ${italic(goal)} does not exist or is not optional`,
                ctx.context));
        return;
    }

    await ctx.preferences.put(`${goal}:enabled`, optIn, { scope: PreferenceScope.Sdm });
    if (optIn) {
        await ctx.addressChannels(
            slackSuccessMessage(
                `Enable Goal`,
                `Successfully enabled ${italic(goal)} goal`));
    } else {
        await ctx.addressChannels(
            slackWarningMessage(
                `Disable Goal`,
                `Successfully disabled ${italic(goal)} goal`,
                ctx.context));
    }
}

function optionalGoalParameter(sdm: SoftwareDeliveryMachine): Array<{ value: string, description: string }> {
    return _.get(sdm, "configuration.sdm.goal.optional", [])
        .map((g: Goal) => ({ value: g.definition.displayName, description: g.definition.displayName }));
}

function createToggleGoalCommand(sdm: SoftwareDeliveryMachine,
                                 enable: boolean): CommandHandlerRegistration<{ goal: string }> {
    return {
        intent: `${enable ? "enable" : "disable"} goal ${sdm.configuration.name.replace("@", "")}`,
        name: enable ? "EnableGoalCommand" : "DisableGoalCommand",
        description: enable ? "Enable SDM goal for a repository" : "Disable SDM goal for a repository",
        autoSubmit: true,
        parameters: { goal: { type: { options: optionalGoalParameter(sdm) } } },
        listener: async ci => toggleGoalEnablement(sdm, ci.parameters.goal, enable, ci),
    };
}

/**
 * Command to enable optional goals
 * @param sdm
 */
export function enableGoalCommand(sdm: SoftwareDeliveryMachine): CommandHandlerRegistration<{ goal: string }> {
    return createToggleGoalCommand(sdm, true);
}

/**
 * Command to disable optional goals
 * @param sdm
 */
export function disableGoalCommand(sdm: SoftwareDeliveryMachine): CommandHandlerRegistration<{ goal: string }> {
    return createToggleGoalCommand(sdm, false);
}
