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
import * as assert from "assert";
import { dotnetCoreScanner } from "../../../lib/element/dotnet/dotnetCoreScanner";

describe("dotnetCoreScanner", () => {

    it("should scan project that has no .csproj file", async () => {

        const p = InMemoryProject.of();
        const stack = await dotnetCoreScanner(p, undefined, undefined, undefined);
        assert(!stack);
    });

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

        const p = InMemoryProject.of({ path: "project.csproj", content });
        const stack = await dotnetCoreScanner(p, undefined, undefined, undefined);
        assert(!stack);
    });

    it("should scan project that has a .csproj file and invalid target framework", async () => {
        const content = `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <Version>0.1.0</Version>
    <AssemblyName>dotnetcoreapp</AssemblyName>
    <TargetFramework>aspdotnet2.2</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>

</Project>`;

        const p = InMemoryProject.of({ path: "project.csproj", content });
        const stack = await dotnetCoreScanner(p, undefined, undefined, undefined);
        assert(!stack);
    });

    it("should scan project that has a .csproj file", async () => {
        const content = `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <Version>0.1.0</Version>
    <AssemblyName>dotnetcoreapp</AssemblyName>
    <TargetFramework>netcoreapp2.2</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>

</Project>`;

        const p = InMemoryProject.of({ path: "project.csproj", content });
        const stack = await dotnetCoreScanner(p, undefined, undefined, undefined);
        assert.strictEqual(stack.target, "netcoreapp2.2");
    });

});
