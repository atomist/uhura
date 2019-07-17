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

import { configureDashboardNotifications } from "@atomist/automation-client-ext-dashboard";
import {
    AutoCodeInspection,
    CachingProjectLoader,
    GitHubLazyProjectLoader,
    SoftwareDeliveryMachineConfiguration,
} from "@atomist/sdm";
import {
    CompressingGoalCache,
    ConfigureOptions,
    configureSdm,
    FileSystemGoalCacheArchiveStore,
} from "@atomist/sdm-core";
import { machineMaker } from "./lib/machine/machine";

const machineOptions: ConfigureOptions = {
    requiredConfigurationValues: [],
};

export const configuration: SoftwareDeliveryMachineConfiguration = {
    postProcessors: [
        configureDashboardNotifications,
        configureSdm(machineMaker(), machineOptions),
    ],
    sdm: {
        goalCache: new CompressingGoalCache(new FileSystemGoalCacheArchiveStore()),
        projectLoader: new GitHubLazyProjectLoader(new CachingProjectLoader()),
        goal: {
            optional: [
                new AutoCodeInspection(),
            ],
        },
    },
};
