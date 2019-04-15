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
import {
    Services,
    ServicesGoalsKey,
} from "@atomist/sdm-pack-analysis";
import * as k8s from "@kubernetes/client-node";
import { DeepPartial } from "ts-essentials";

/**
 * Default mongo service for this SDM
 */
export const Mongo = mongo();

/**
 * Create a ServiceRegistration for Mongo running in a k8s container alongside the goal.
 * @param tag
 */
export function mongo(tag: string = "latest"): K8sServiceRegistration {

    const container: DeepPartial<k8s.V1Container> = {
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
        securityContext: {
            allowPrivilegeEscalation: false,
            privileged: false,
            readOnlyRootFilesystem: true,
            runAsGroup: 999,
            runAsUser: 999,
        },
        volumeMounts: [
            {
                mountPath: "/data/db",
                name: "mongo-data",
            },
            {
                mountPath: "/tmp",
                name: "mongo-tmp",
            },
        ],
    };

    const volumes: Array<DeepPartial<k8s.V1Volume>> = [
        {
            emptyDir: {},
            name: "mongo-data",
        },
        {
            emptyDir: {},
            name: "mongo-tmp",
        },
    ];

    const spec: K8sServiceSpec = {
        container: container as k8s.V1Container,
        volume: volumes as k8s.V1Volume[],
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
