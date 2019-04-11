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

import { CodeTransform } from "@atomist/sdm";
import * as k8s from "@kubernetes/client-node";
import { DeepPartial } from "ts-essentials";
import { SelectedRepo } from "../common/SelectedRepoFinder";

/**
 * 'Spring REST Project' transform to add:
 * - deployment.json to run as non root user
 * - Dockerfile
 * - .dockerignore
 * - pom.xml to include finalName
 *
 * @param p project created from express-es6-rest-api seed.
 * @return the updated project
 */
const SpringRestProjectApiCodeTransform: CodeTransform = async p => {
    const deployment: DeepPartial<k8s.V1Deployment> = {
        spec: {
            template: {
                spec: {
                    containers: [
                        {
                            securityContext: {
                                allowPrivilegeEscalation: false,
                                privileged: false,
                                readOnlyRootFilesystem: true,
                            },
                            volumeMounts: [
                                {
                                    mountPath: "/tmp",
                                    name: "spring-tmp",
                                },
                            ],
                        },
                    ],
                    securityContext: {
                        fsGroup: 1001,
                        runAsGroup: 1001,
                        runAsNonRoot: true,
                        runAsUser: 1001,
                        supplementalGroups: [],
                        sysctls: [],
                    },
                    volumes: [
                        {
                            emptyDir: {},
                            name: "spring-tmp",
                        },
                    ],
                },
            },
        },
    };
    await p.addFile(".atomist/kubernetes/deployment.json", JSON.stringify(deployment, undefined, 2));

    const pomFile = await p.getFile("pom.xml");
    const pom = await pomFile.getContent();

    const newPom = pom.replace(/<build>/, `<build>
\t\t<finalName>${p.name}</finalName>`);
    await pomFile.setContent(newPom);

    // tslint:disable:max-line-length
    const dockerfile = `FROM openjdk:8
ENV DUMB_INIT_VERSION=1.2.2
RUN curl -s -L -O https://github.com/Yelp/dumb-init/releases/download/v$DUMB_INIT_VERSION/dumb-init_\${DUMB_INIT_VERSION}_amd64.deb \
    && dpkg -i dumb-init_\${DUMB_INIT_VERSION}_amd64.deb \
    && rm -f dumb-init_\${DUMB_INIT_VERSION}_amd64.deb
MAINTAINER Atomist <docker@atomist.com>
RUN mkdir -p /app
WORKDIR /app
EXPOSE 8080
CMD ["-jar", "${p.name}.jar"]
ENTRYPOINT ["dumb-init", "java", "-XX:+UnlockExperimentalVMOptions", "-XX:+UseCGroupMemoryLimitForHeap", "-Xmx256m", "-Djava.security.egd=file:/dev/urandom"]
COPY target/${p.name}.jar ${p.name}.jar
`;
    // tslint:enable

    const dockerignore = `*
!target/${p.name}.jar`;

    await p.addFile("Dockerfile", dockerfile);
    await p.addFile(".dockerignore", dockerignore);

    return p;
};

/**
 * Default hard-coded list of seeds.
 */
export const DefaultSpringSeeds: SelectedRepo[] = [
    {
        url: "https://github.com/atomist-seeds/spring-rest-seed",
        description: "Spring REST Project",
        transform: SpringRestProjectApiCodeTransform,
    },
];
