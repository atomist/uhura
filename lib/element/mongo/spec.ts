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
    K8sServiceRegistration,
    K8sServiceSpec,
} from "@atomist/sdm-core";
import { K8sServiceRegistrationType } from "@atomist/sdm-core/lib/pack/k8s/service";
import { Services } from "@atomist/sdm-pack-analysis";
import { ServicesGoalsKey } from "@atomist/sdm-pack-analysis/lib/analysis/support/enrichGoal";
import * as k8s from "@kubernetes/client-node";

/**
 * Default mongo service for this SDM
 */
export const Mongo = mongo();

/**
 * Create a ServiceRegistration for Mongo running in a k8s container alongside the goal.
 * @param tag
 */
export function mongo(tag: string = "latest"): K8sServiceRegistration {

    const container: k8s.V1Container = {
        name: "mongo",
        image: `mongo:${tag}`,
        imagePullPolicy: "IfNotPresent",
        ports: [{
            name: "http",
            containerPort: 27017,
            protocol: "TCP",
        } as any],
        resources: {
            limits: {
                cpu: "100m",
                memory: "512Mi",
            },
            requests: {
                cpu: "100m",
                memory: "256Mi",
            },
        },
    } as any;

    const spec: K8sServiceSpec = {
        container,
    };

    return {
        name: "mongo",
        service: async goalEvent => {
            if (!!goalEvent.data) {
                const data = JSON.parse(goalEvent.data);
                const services = data[ServicesGoalsKey] as Services;
                if (!!services && !!services.mongodb) {
                    return {
                        type: K8sServiceRegistrationType.K8sService,
                        spec,
                    };
                }
            }
            return undefined;
        },
    };
}
