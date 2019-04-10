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

import { InMemoryProject } from "@atomist/automation-client";
import {
    StringCapturingProgressLog,
} from "@atomist/sdm";
import { Interpretation } from "@atomist/sdm-pack-analysis";
import * as assert from "assert";
import {
    DotnetCoreInterpreter,
    DotnetCoreProjectVersioner,
} from "../../../lib/element/dotnet/DotnetCoreInterpreter";

describe("DotnetCoreInterpreter", () => {

    describe("DotnetCoreInterpreter", () => {

        it("should interpret project with dotnetcore analysis", async () => {
            const interpreter = new DotnetCoreInterpreter();
            const interpretation: Interpretation = {
                reason: {
                    analysis: {
                        elements: {
                            dotnetcore: {
                                name: "dotnetcore",
                                tags: ["dotnetcore"],
                            },
                        },
                    },
                },
                materialChangePushTests: [],
            } as any;
            const enriched = await interpreter.enrich(interpretation);
            assert(enriched);
            assert(!!interpretation.buildGoals);
        });

        it("should interpret project with no analysis", async () => {
            const interpreter = new DotnetCoreInterpreter();
            const interpretation: Interpretation = {
                reason: {
                    analysis: {
                        elements: {
                            node: {
                                name: "node",
                                tags: ["node"],
                            },
                        },
                    },
                },
                materialChangePushTests: [],
            } as any;
            const enriched = await interpreter.enrich(interpretation);
            assert(!enriched);
            assert(!interpretation.buildGoals);
        });

    });

    describe("DotnetCoreProjectVersioner", () => {

        it("should version project from version in .csproj", async () => {
            const content = `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <Version>1.1.0</Version>
    <AssemblyName>dotnetcoreapp</AssemblyName>
    <TargetFramework>netcoreapp2.2</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>

</Project>`;

            const p = InMemoryProject.of({ path: "project.csproj", content });
            const version = await DotnetCoreProjectVersioner({ branch: "master" } as any, p as any, new StringCapturingProgressLog());
            assert(!!version);
            assert(version.startsWith("1.1.0-master."));
        });

        it("should version project with no version in .csproj", async () => {
            const content = `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <AssemblyName>dotnetcoreapp</AssemblyName>
    <TargetFramework>netcoreapp2.2</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>

</Project>`;

            const p = InMemoryProject.of({ path: "project.csproj", content });
            const version = await DotnetCoreProjectVersioner({ branch: "master" } as any, p as any, new StringCapturingProgressLog());
            assert(!!version);
            assert(version.startsWith("0.0.1-master."));
        });

        it("should version project with no .csproj file", async () => {
            const p = InMemoryProject.of();
            const version = await DotnetCoreProjectVersioner({ branch: "some/branch" } as any, p as any, new StringCapturingProgressLog());
            assert(!!version);
            assert(version.startsWith("0.0.1-some.branch."));
        });

    });

});
