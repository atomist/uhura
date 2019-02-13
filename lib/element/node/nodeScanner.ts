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
    RegexFileParser,
} from "@atomist/automation-client";
import { matchIterator } from "@atomist/automation-client/lib/tree/ast/astUtils";
import {
    Service,
    TechnologyElement,
    TechnologyScanner,
    TechnologyStack,
} from "@atomist/sdm-pack-analysis";
import * as _ from "lodash";
import { PackageJson } from "./PackageJson";

export interface TypeScriptInfo {

    tslint: {
        hasConfig: boolean;
    };
}

export interface JavaScriptInfo {

    eslint: {
        hasConfig: boolean;
        hasDependency: boolean;
    };
}

/**
 * Subset of PackageJson to persist with analysis to avoid serialized data
 * structure being excessively large.
 */
export type PackageJsonSummary = Pick<PackageJson, "name" | "description" | "author" | "version" | "scripts">;

/**
 * Represents use of Node in a project
 */
export interface NodeStack extends TechnologyStack {

    name: "node";

    typeScript?: TypeScriptInfo;

    javaScript?: JavaScriptInfo;

    packageJson: PackageJsonSummary;

}

export const nodeScanner: TechnologyScanner<NodeStack> = async p => {
    const packageJsonFile = await p.getFile("package.json");
    if (!packageJsonFile) {
        return undefined;
    }
    try {
        const packageJsonStr = await packageJsonFile.getContent();
        const rawPackageJson = JSON.parse(packageJsonStr) as PackageJson;

        // Extract the information we want to summarize
        const packageJson: PackageJsonSummary = {
            author: rawPackageJson.author,
            name: rawPackageJson.name,
            description: rawPackageJson.description,
            scripts: rawPackageJson.scripts || {},
            version: rawPackageJson.version,
        };

        const javaScriptInto: JavaScriptInfo = {
            eslint: {
                hasConfig: await p.hasFile(".eslintrc") || await p.hasFile(" .eslintrc.json"),
                hasDependency: hasDependency(rawPackageJson, "eslint"),
            },
        };

        // Add services per our dependencies
        const services: Record<string, Service> = {};
        if (hasDependency(rawPackageJson, "mongoose", "mongodb")) {
            services.mongodb = {};
        }

        const stack: NodeStack = {
            projectName: packageJson.name,
            packageJson,
            name: "node",
            tags: ["node"],
            referencedEnvironmentVariables: await findEnvironmentVariables(p),
            dependencies: Object.getOwnPropertyNames(rawPackageJson.dependencies || {}).map(name => {
                return {
                    // TODO should probably parse this better
                    group: name,
                    artifact: name,
                    version: rawPackageJson.dependencies[name],
                };
            }),
            javaScript: javaScriptInto,
            services,
        };
        return stack;
    } catch {
        // Ill-formed JSON
        return undefined;
    }
};

const envReferenceParser = new RegexFileParser({
    rootName: "envs",
    matchName: "env",
    regex: /process\.env\.([A-Za-z0-9_]+)/,
    captureGroupNames: ["name"],
});

/**
 * Find all environment variables referenced in JavaScript or TypeScript
 * via process.env.KEY
 */
async function findEnvironmentVariables(p: Project): Promise<string[]> {
    const it = matchIterator<{ name: string }>(p, {
        parseWith: envReferenceParser,
        globPatterns: ["**/*.js", "**/*.ts"],
        pathExpression: "//envs/env",
    });
    const matches: string[] = [];
    for await (const match of it) {
        if (!matches.includes(match.name)) {
            matches.push(match.name);
        }
    }
    return matches;
}

/**
 * Check if a given package json expresses a dependency
 */
function hasDependency(pj: PackageJson, ...dependencies: string[]): boolean {
    for (const dependency of dependencies) {
        if (!!_.get(pj, `dependencies.${dependency}`)
            || !!_.get(pj, `devDependencies.${dependency}`)) {
            return true;
        }
    }
    return false;
}
