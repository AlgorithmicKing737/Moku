{ lib, stdenv, nodejs_22, pnpm, pnpmConfigHook, fetchPnpmDeps, version, src, versions }:

stdenv.mkDerivation {
  pname = "moku-frontend";
  inherit version src;

  nativeBuildInputs = [ nodejs_22 pnpm pnpmConfigHook ];

  pnpmDeps = fetchPnpmDeps {
    pname = "moku-frontend";
    inherit version src;
    fetcherVersion = 1;
    hash = versions.frontend.pnpmHash;
  };

  buildPhase = ''
    export HOME=$(mktemp -d)
    pnpm build:static
  '';

  installPhase = "cp -r dist $out";
}