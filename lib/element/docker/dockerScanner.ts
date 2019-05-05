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
    Project,
    projectUtils,
} from "@atomist/automation-client";
import { SdmContext } from "@atomist/sdm";
import {
    FastProject,
    TechnologyElement,
    TechnologyScanner,
} from "@atomist/sdm-pack-analysis";
import {
    PhasedTechnologyScanner,
    TechnologyClassification,
} from "@atomist/sdm-pack-analysis/lib/analysis/TechnologyScanner";

import {
    DockerfileParser,
    From,
} from "dockerfile-ast";

export interface ParsedFile {

    /**
     * Image if we were able to determine it
     */
    image?: string;

    /**
     * Exposed ports
     */
    ports?: string[];
}

export interface DockerFile {

    path: string;
    content: string;

    /**
     * Parsed content on a full analysis
     */
    parsed?: ParsedFile;

}

export interface DockerStack extends TechnologyElement {

    name: "docker";

    /**
     * Content of the Dockerfile we found
     */
    dockerFile: DockerFile;

}

export class DockerScanner implements PhasedTechnologyScanner<DockerStack> {

    public async classify(p: FastProject, ctx: SdmContext): Promise<TechnologyClassification | undefined> {
        return undefined;
    }

    get scan(): TechnologyScanner<DockerStack> {
        return async (p, ctx, analysisSoFar, options) => {
            const dockerFilePath = await getDockerfile(p);

            if (!dockerFilePath) {
                return undefined;
            }

            let dockerFile: DockerFile;
            try {
                const content = await p.getFile(dockerFilePath).then(f => f.getContent());
                dockerFile = {
                    path: dockerFilePath,
                    content,
                };
                if (options.full) {
                    dockerFile.parsed = parseDockerFile(content);
                }
            } catch {
                // Never fail
            }

            return {
                tags: ["docker"],
                name: "docker",
                dockerFile,
            };
        };
    }
}

function parseDockerFile(content: string): ParsedFile {
    let image: string;
    const ports: string[] = [];
    const dockerfile = DockerfileParser.parse(content);
    dockerfile.getInstructions().forEach(i => {
        switch (i.getKeyword()) {
            case "FROM":
                const f = i as From;
                image = f.getImage();
                break;
            case "EXPOSE":
                ports.push(i.getArgumentsContent());
                break;
            default:
                break;
        }
    });
    return {
        image,
        ports,
    };
}

/**
 * Return the path of the Docker file
 * @param {Project} p
 * @return {Promise<string>}
 */
export async function getDockerfile(p: Project): Promise<string> {
    const dockerfiles = await projectUtils.gatherFromFiles(p, "**/Dockerfile", async f => f);
    if (!!dockerfiles && dockerfiles.length > 0) {
        return dockerfiles[0].path;
    }
    return undefined;
}
