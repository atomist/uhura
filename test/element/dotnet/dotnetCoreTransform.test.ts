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
    InMemoryProject,
    Project,
} from "@atomist/automation-client";
import { ProjectAnalysis } from "@atomist/sdm-pack-analysis";
import * as assert from "assert";
import {
    DotnetCoreProjectFileCodeTransform,
    DotnetCoreTransformRecipeContributor,
} from "../../../lib/element/dotnet/dotnetCoreTransforms";

describe("dotnetCoreTransforms", () => {

    describe("DotnetCoreTransformRecipeContributor", () => {

        it("should return appropriate transforms for .NET Core projects", async () => {
            const contributor = new DotnetCoreTransformRecipeContributor();
            const p = InMemoryProject.of();
            const analysis: ProjectAnalysis = {
                elements: {
                    dotnetcore: {
                        name: "dotnetcore",
                        tags: ["dotnetcore"],
                    },
                },
            } as any;
            const contribution = await contributor.analyze(p, analysis, undefined);
            assert.strictEqual(contribution.transforms.length, 1);
        });

        it("should not return transforms for non .NET Core projects", async () => {
            const contributor = new DotnetCoreTransformRecipeContributor();
            const p = InMemoryProject.of();
            const analysis: ProjectAnalysis = {
                elements: {
                    node: {
                        name: "node",
                        tags: ["node"],
                    },
                },
            } as any;
            const contribution = await contributor.analyze(p, analysis, undefined);
            assert(!contribution);
        });
    });

    describe("DotnetCoreProjectFileCodeTransform", () => {

        it("should scan project that has a .csproj file but no target framework", async () => {
            const content = `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <Version>0.1.0</Version>
    <AssemblyName>dotnetcoreapp</AssemblyName>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>

</Project>`;

            const p = InMemoryProject.from({ repo: "foo-project" } as any, { path: "project.csproj", content });
            const rp = await DotnetCoreProjectFileCodeTransform(p, undefined) as Project;
            assert(await rp.hasFile("foo-project.csproj"));
            assert.strictEqual(await (await rp.getFile("foo-project.csproj")).getContent(), content);
        });
    });

});
